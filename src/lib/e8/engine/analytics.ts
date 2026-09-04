import type { ConsistencySnapshot } from "./consistency";
import type { Guardrails } from "../markets/catalog";

export type Trade = {
  id: string;
  date: string;
  symbol: string;
  side: "long" | "short";
  /** Net PNL after fees. */
  pnl: number;
  fees: number;
  grossPnl?: number;
  risk?: number;
  booked: boolean;
  /** USD notional of the fill. Never lots. */
  notional?: number;
  entry?: number;
  exit?: number;
  openedAt?: string;
  closedAt?: string;
};

export type TradeStats = {
  count: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  expectancy: number | null;
  profitFactor: number | null;
  avgR: number | null;
  payoff: number | null;
};

export function computeStats(trades: Trade[]): TradeStats {
  const booked = trades.filter((t) => t.booked);
  const wins = booked.filter((t) => t.pnl > 0);
  const losses = booked.filter((t) => t.pnl < 0);
  const sumWins = wins.reduce((a, t) => a + t.pnl, 0);
  const sumLossAbs = losses.reduce((a, t) => a + Math.abs(t.pnl), 0);
  const withR = booked.filter((t) => t.risk && t.risk > 0);
  const avgWin = wins.length ? sumWins / wins.length : null;
  const avgLoss = losses.length ? sumLossAbs / losses.length : null;
  const winRate = booked.length ? wins.length / booked.length : null;
  const expectancy =
    winRate == null || avgWin == null || avgLoss == null
      ? booked.length
        ? booked.reduce((a, t) => a + t.pnl, 0) / booked.length
        : null
      : winRate * avgWin - (1 - winRate) * avgLoss;
  const payoff = avgWin != null && avgLoss != null && avgLoss > 0 ? avgWin / avgLoss : null;
  const avgR = withR.length
    ? withR.reduce((a, t) => a + t.pnl / (t.risk as number), 0) / withR.length
    : payoff;
  const profitFactor = sumLossAbs > 0 ? sumWins / sumLossAbs : wins.length ? Infinity : null;

  return {
    count: booked.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    avgR,
    payoff,
  };
}

export type CoachCard = {
  tone: "ok" | "watch" | "danger" | "breach" | "info";
  title: string;
  body: string;
};

export function coach(opts: {
  snap: ConsistencySnapshot;
  stats: TradeStats;
  guardrails: Guardrails;
  accountSize: number;
  liveOpenPnl: number;
  liveSymbol: string | null;
}): CoachCard[] {
  const { snap, stats, guardrails, accountSize, liveOpenPnl, liveSymbol } = opts;
  const cards: CoachCard[] = [];
  const rPct = Math.round(snap.ratio * 100);

  if (snap.closeNow) {
    cards.push({
      tone: "breach",
      title: `Red alert — close ${liveSymbol ?? "the trade"} now`,
      body: `Booking the open P&L would print a best day above ${rPct}% of cycle profit. Flatten. Do not trail this. Splitting the close across days is a prohibited bypass.`,
    });
  } else if (snap.scaleOut) {
    const room = snap.liveHeadroom ?? 0;
    cards.push({
      tone: "danger",
      title: "Scale out — you are running into the best-day ceiling",
      body: `Only ${fmt(room)} of open profit can still be booked today without this session becoming an illegal best day. Bank a partial, leave a runner sized so a continuation cannot exceed that remainder.`,
    });
  }

  if (snap.alert === "first-day") {
    const later = snap.todayProjected > 0 ? snap.todayProjected / snap.ratio - snap.todayProjected : 0;
    cards.push({
      tone: "info",
      title: "Day 1 is always 100% of profits",
      body: `A first profitable day can never clear the ${rPct}% rule on its own. Ideal: three similar days, then request. This print of ${fmt(snap.todayProjected)} means you still need ${fmt(later)} on other days before payout. Keep it modest.`,
    });
  }

  if (!snap.eligible && snap.remainingToFulfill > 0 && snap.alert !== "first-day") {
    cards.push({
      tone: snap.alert === "danger" ? "danger" : "watch",
      title: `${fmt(snap.remainingToFulfill)} still required to dilute the best day`,
      body: `Best day ${fmt(snap.bestDay)} ÷ ${snap.ratio.toFixed(2)} = ${fmt(snap.minTotalRequired)} minimum cycle profit. You are at ${fmt(snap.cycleProfit)}. Print this remainder on a different day — do not add to the best day.`,
    });
  }

  if (!snap.closeNow && snap.eligible && snap.cycleProfit < guardrails.minPayout) {
    cards.push({
      tone: "watch",
      title: "Consistency is clean, min payout is not",
      body: `E8 requires net profit requested > 50% of daily drawdown. Min payout on this size is ${fmt(guardrails.minPayout)}. Cycle profit ${fmt(snap.cycleProfit)} is short by ${fmt(guardrails.minPayout - snap.cycleProfit)}.`,
    });
  }

  if (!snap.closeNow && snap.eligible && snap.cycleProfit >= guardrails.minPayout) {
    cards.push({
      tone: "ok",
      title: "Payout window is open",
      body: `Best day is ${snap.bestDayShare != null ? (snap.bestDayShare * 100).toFixed(1) : "—"}% of cycle profit (cap ${rPct}%). Cycle profit ${fmt(snap.cycleProfit)} clears the ${fmt(guardrails.minPayout)} min-payout test. After you request, Best Day and Performance reset — leftover buffer is excluded from the next cycle.`,
    });
  }

  const headroom = snap.todayHeadroom;
  if (headroom != null && headroom > 0 && stats.avgWin && stats.avgWin > headroom) {
    cards.push({
      tone: "danger",
      title: "Your average winner would breach today",
      body: `Avg win ${fmt(stats.avgWin)} vs today's remaining headroom ${fmt(headroom)}. Cut the next target to ~${fmt(headroom * 0.75)} (${((headroom * 0.75) / accountSize * 100).toFixed(2)}% of size) or wait for the next session.`,
    });
  }

  const next = nextSetup(snap, stats, guardrails, accountSize);
  cards.push({
    tone: "info",
    title: next.title,
    body: next.body,
  });

  if (liveOpenPnl > 0 && snap.liveHeadroom != null && !snap.closeNow) {
    cards.push({
      tone: snap.liveHeadroom < liveOpenPnl * 0.5 ? "watch" : "ok",
      title: `${fmt(snap.liveHeadroom)} of open profit left before ${rPct}%`,
      body: `If ${liveSymbol ?? "this trade"} keeps running, flatten or hard-cap the runner so booked today cannot exceed ${fmt(snap.maxAllowedToday ?? 0)}. Trail stops into the cash, not into a new best day.`,
    });
  }

  return cards;
}

function nextSetup(
  snap: ConsistencySnapshot,
  stats: TradeStats,
  guardrails: Guardrails,
  accountSize: number,
): { title: string; body: string } {
  const oneR = suggestOneR(stats, guardrails, accountSize);
  const headroom = snap.liveHeadroom ?? snap.todayHeadroom;
  const cap = headroom != null && headroom > 0 ? headroom * 0.75 : oneR * 2;
  const target = Math.max(0, Math.min(cap, oneR * 2));
  const rMultiple = oneR > 0 ? target / oneR : 0;
  const wr = stats.winRate;

  if (headroom != null && headroom <= 0 && snap.profitExToday > 0) {
    return {
      title: "No more winners today",
      body: `Today is already at the ${Math.round(snap.ratio * 100)}% ceiling versus other-day profit. Stand down. Tomorrow you can print up to ${fmt(snap.maxAllowedToday ?? 0)} without lifting the best day.`,
    };
  }

  const wrText = wr == null ? "no sample yet" : `${(wr * 100).toFixed(0)}% win rate`;
  const expText = stats.expectancy == null ? "n/a" : `${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(0)} expectancy / trade`;

  return {
    title: `Next R: risk ${fmt(oneR)} · target ${fmt(target)} (${rMultiple.toFixed(1)}R)`,
    body: `Sized off ${wrText}, ${expText}. Target is the lesser of 2R and 75% of today's consistency headroom so a full winner cannot become a new best day. Stop belongs inside the daily drawdown (${fmt(guardrails.dailyDrawdown)}) and the 5% budget cap (${fmt(guardrails.budgetCap)}).`,
  };
}

export function suggestOneR(stats: TradeStats, guardrails: Guardrails, accountSize: number): number {
  const fromStats = stats.avgLoss && stats.avgLoss > 0 ? stats.avgLoss : null;
  const fromSize = accountSize * 0.005;
  const fromDd = guardrails.dailyDrawdown * 0.2;
  const fromBudget = guardrails.budgetCap * 0.25;
  const raw = Math.min(fromStats ?? Infinity, fromSize, fromDd, fromBudget);
  return Math.max(25, Math.round(raw));
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
