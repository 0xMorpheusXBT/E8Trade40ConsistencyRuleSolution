/**
 * Funded-stage target planner.
 *
 * Input: account size, the dollars the trader wants to make this cycle,
 * win rate, R-multiple, trades/day, live booked P&L.
 *
 * Output: risk/trade, win/trade, how many trades/sessions remain, and
 * whether the current book has already forced the target up because a
 * best day exceeded 40% of the *stated* goal.
 *
 * Canonical identities (help 10450125):
 *   maxBestDay(target) = r · target
 *   minTotal(best)     = best / r
 *   maxToday           = (r / (1-r)) · profitExToday     // 2/3 at r=0.40
 *
 * E8's own ideal path: three similar days, then request.
 * Scope: E8 One Performance only. E8 Pro has no consistency rule.
 */

export type PlanInput = {
  accountSize: number;
  targetProfit: number;
  ratio: number;
  winRate: number;
  rewardRisk: number;
  tradesPerDay: number;
  dailyDrawdown: number;
  dailyProfitCap: number | null;
  budgetCap: number;
  maxDrawdown: number;
  minPayout: number;
  payoutPct: number;
  cycleProfit: number;
  bestDay: number;
  todayBooked: number;
};

export type PathKind =
  | "three-similar"
  | "dilute-first"
  | "raised-bar"
  | "min-payout"
  | "too-aggressive"
  | "locked-today";

export type CyclePlan = {
  target: number;
  takeHome: number;
  ratio: number;
  maxBestDay: number;
  minEqualDays: number;
  idealDayProfit: number;
  plannedDayProfit: number;
  dayCeiling: number;
  suggestedRisk: number;
  suggestedWin: number;
  riskPctOfSize: number;
  riskPctOfDailyDd: number;
  consecutiveLossesToDaily: number;
  winRate: number;
  rewardRisk: number;
  expectancy: number;
  winningTradesToTarget: number;
  expectedTradesToTarget: number;
  plannedSessions: number;
  expectedSessions: number;
  tradesPerDay: number;
  /** Live: target may have been forced up by a fat best day. */
  effectiveTarget: number;
  barRaised: boolean;
  remainingToTarget: number;
  remainingToDilute: number;
  remainingWinningTrades: number;
  remainingExpectedTrades: number;
  remainingSessions: number;
  maxNextWin: number;
  todayRoom: number | null;
  shareOfTarget: number | null;
  shareOfCycle: number | null;
  path: PathKind;
  pathTitle: string;
  pathBody: string;
  warnings: string[];
};

export function defaultTargetProfit(size: number, minPayout: number): number {
  const eightPct = size * 0.08;
  const threeMin = minPayout * 3;
  return Math.round(Math.max(eightPct, threeMin) / 100) * 100;
}

function remainingFromBest(bestDay: number, cycleProfit: number, ratio: number): number {
  if (bestDay <= 0) return 0;
  return Math.max(0, bestDay / ratio - cycleProfit);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function ceilPos(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n - 1e-9);
}

export function planCycle(input: PlanInput): CyclePlan {
  const r = clamp(input.ratio, 0.05, 0.95);
  const target = Math.max(0, input.targetProfit);
  const wr = clamp(input.winRate, 0.05, 0.95);
  const rr = Math.max(0.25, input.rewardRisk);
  const tradesPerDay = Math.max(1, Math.round(input.tradesPerDay));

  const maxBestDay = target * r;
  const minEqualDays = Math.max(2, Math.ceil(1 / r - 1e-9));
  const idealDayProfit = minEqualDays > 0 ? target / minEqualDays : target;

  const dailyCap = input.dailyProfitCap != null && input.dailyProfitCap > 0 ? input.dailyProfitCap : null;
  const dayCeiling = dailyCap == null ? maxBestDay : Math.min(maxBestDay, dailyCap);
  // Plan days inside 82.5% of the ceiling so a slightly bigger winner does not lock the cycle.
  const plannedDayProfit = Math.min(idealDayProfit, dayCeiling * 0.825);

  const winFromDay = plannedDayProfit / tradesPerDay;
  const riskFromWin = winFromDay / rr;
  const riskCapDd = input.dailyDrawdown * 0.2;
  const riskCapSize = input.accountSize * 0.005;
  const riskCapBudget = input.budgetCap * 0.25;
  const riskCapMaxDd = input.maxDrawdown * 0.1;

  const suggestedRisk = Math.max(
    1,
    Math.min(riskFromWin, riskCapDd, riskCapSize, riskCapBudget, riskCapMaxDd),
  );
  const suggestedWin = suggestedRisk * rr;
  const expectancy = wr * suggestedWin - (1 - wr) * suggestedRisk;

  const winningTradesToTarget = suggestedWin > 0 ? ceilPos(target / suggestedWin) : 0;
  const expectedTradesToTarget = expectancy > 0 ? ceilPos(target / expectancy) : 0;
  const plannedSessions = suggestedWin > 0 ? ceilPos(target / (suggestedWin * tradesPerDay)) : 0;
  const expectedSessions = expectancy > 0 ? ceilPos(target / (expectancy * tradesPerDay)) : 0;

  const riskPctOfSize = input.accountSize > 0 ? (suggestedRisk / input.accountSize) * 100 : 0;
  const riskPctOfDailyDd = input.dailyDrawdown > 0 ? (suggestedRisk / input.dailyDrawdown) * 100 : 0;
  const consecutiveLossesToDaily =
    suggestedRisk > 0 ? Math.floor(input.dailyDrawdown / suggestedRisk) : 0;

  const minTotalFromBest = input.bestDay > 0 ? input.bestDay / r : 0;
  const effectiveTarget = Math.max(target, minTotalFromBest, input.minPayout);
  const barRaised = minTotalFromBest > target + 1e-6;
  const remainingToTarget = Math.max(0, effectiveTarget - input.cycleProfit);
  const remainingToDilute = remainingFromBest(input.bestDay, input.cycleProfit, r);

  const remainingWinningTrades = suggestedWin > 0 ? ceilPos(remainingToTarget / suggestedWin) : 0;
  const remainingExpectedTrades = expectancy > 0 ? ceilPos(remainingToTarget / expectancy) : 0;
  const remainingSessions =
    expectancy > 0 ? ceilPos(remainingToTarget / (expectancy * tradesPerDay)) : 0;

  const profitExToday = input.cycleProfit - input.todayBooked;
  const maxToday =
    profitExToday > 0 && r < 1 ? (r / (1 - r)) * profitExToday : dayCeiling;
  const todayRoom = maxToday - input.todayBooked;
  const roomVsTarget = Math.max(0, maxBestDay - Math.max(0, input.todayBooked));
  const maxNextWin = Math.max(
    0,
    Math.min(
      suggestedWin * 1.15,
      roomVsTarget,
      dailyCap == null ? Infinity : Math.max(0, dailyCap - input.todayBooked),
      profitExToday > 0 ? Math.max(0, todayRoom) : roomVsTarget,
    ),
  );

  const shareOfTarget = target > 0 && input.bestDay > 0 ? input.bestDay / target : null;
  const shareOfCycle = input.cycleProfit > 0 && input.bestDay > 0 ? input.bestDay / input.cycleProfit : null;

  const warnings: string[] = [];
  if (target + 1e-9 < input.minPayout) {
    warnings.push(
      `E8 will not pay ${fmt(target)}. Min payout on this size is ${fmt(input.minPayout)} (50% of daily drawdown + $1).`,
    );
  }
  if (target > input.accountSize * 0.15) {
    warnings.push(
      `${fmt(target)} is ${((target / input.accountSize) * 100).toFixed(0)}% of the account. That is a multi-cycle or aggressive book — print it as several payouts, not one hero week.`,
    );
  }
  if (idealDayProfit > input.dailyDrawdown * 1.5) {
    warnings.push(
      `An ideal day of ${fmt(idealDayProfit)} is ${((idealDayProfit / input.dailyDrawdown) * 100).toFixed(0)}% of daily drawdown. Size is fine on the way up; the stop still has to live inside ${fmt(input.dailyDrawdown)}.`,
    );
  }
  if (barRaised) {
    warnings.push(
      `Best day ${fmt(input.bestDay)} is above ${Math.round(r * 100)}% of the stated ${fmt(target)} target. The rule now requires ${fmt(effectiveTarget)} total (${fmt(input.bestDay)} ÷ ${r.toFixed(2)}).`,
    );
  }

  const takeHome = target * (input.payoutPct / 100);

  const path = pickPath({
    target,
    minPayout: input.minPayout,
    barRaised,
    remainingToDilute,
    shareOfCycle,
    ratio: r,
    todayRoom: profitExToday > 0 ? todayRoom : null,
    accountSize: input.accountSize,
    plannedSessions,
  });

  return {
    target,
    takeHome,
    ratio: r,
    maxBestDay,
    minEqualDays,
    idealDayProfit,
    plannedDayProfit,
    dayCeiling,
    suggestedRisk,
    suggestedWin,
    riskPctOfSize,
    riskPctOfDailyDd,
    consecutiveLossesToDaily,
    winRate: wr,
    rewardRisk: rr,
    expectancy,
    winningTradesToTarget,
    expectedTradesToTarget,
    plannedSessions,
    expectedSessions,
    tradesPerDay,
    effectiveTarget,
    barRaised,
    remainingToTarget,
    remainingToDilute,
    remainingWinningTrades,
    remainingExpectedTrades,
    remainingSessions,
    maxNextWin,
    todayRoom: profitExToday > 0 ? todayRoom : null,
    shareOfTarget,
    shareOfCycle,
    path: path.kind,
    pathTitle: path.title,
    pathBody: path.body,
    warnings,
  };
}

function pickPath(opts: {
  target: number;
  minPayout: number;
  barRaised: boolean;
  remainingToDilute: number;
  shareOfCycle: number | null;
  ratio: number;
  todayRoom: number | null;
  accountSize: number;
  plannedSessions: number;
}): { kind: PathKind; title: string; body: string } {
  const rPct = Math.round(opts.ratio * 100);

  if (opts.todayRoom != null && opts.todayRoom <= 0) {
    return {
      kind: "locked-today",
      title: "Stand down for today",
      body: `Today is at the ${rPct}% ceiling versus other-day profit. More winners today raise the bar. The realistic path is tomorrow — same size, different session.`,
    };
  }
  if (opts.target + 1e-9 < opts.minPayout) {
    return {
      kind: "min-payout",
      title: `Raise the target to ${fmt(opts.minPayout)}`,
      body: `E8 will not wire less than 50% of daily drawdown. Set the goal to the min payout, print three similar days, request.`,
    };
  }
  if (opts.barRaised) {
    return {
      kind: "raised-bar",
      title: "The last winner raised the bar",
      body: `A fat day is not a failure and not a scam — it is a larger denominator. Keep risking the planned R on a *different* day until total profit ≥ best day ÷ ${opts.ratio.toFixed(2)}. Do not add to the best day.`,
    };
  }
  if (opts.remainingToDilute > 0 && opts.shareOfCycle != null && opts.shareOfCycle > opts.ratio) {
    return {
      kind: "dilute-first",
      title: `Dilute ${fmt(opts.remainingToDilute)} before chasing more`,
      body: `Best day is ${(opts.shareOfCycle * 100).toFixed(1)}% of cycle profit. Print the remainder on other sessions at the planned win size. Then keep going to the stated target.`,
    };
  }
  if (opts.target > opts.accountSize * 0.15) {
    return {
      kind: "too-aggressive",
      title: "Split this into payout cycles",
      body: `${fmt(opts.target)} in one cycle is a lottery-ticket shape even if the math fits. Take ${opts.plannedSessions || 3} similar days to a smaller payout, reset Best Day, repeat. Leftover buffer does not count next cycle.`,
    };
  }
  return {
    kind: "three-similar",
    title: `Three similar days of ${fmt(opts.target / 3)}`,
    body: `E8's own copy: three similar days, then request. Each day lands at ${(100 / 3).toFixed(1)}% of the target — under the ${rPct}% cap with room. Same risk, same win, no hero trade.`,
  };
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Session-by-session skeleton of the three-similar-days plan (or N sessions). */
export function plannedDays(plan: CyclePlan, count = 3): { day: number; profit: number; share: number }[] {
  const n = Math.max(plan.minEqualDays, count);
  const slice = plan.target / n;
  return Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    profit: slice,
    share: plan.target > 0 ? slice / plan.target : 0,
  }));
}
