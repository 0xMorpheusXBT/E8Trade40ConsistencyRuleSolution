/**
 * Full-port + tight-stop sizing.
 *
 * Question this answers:
 *   "I have a 100K, 15x on BTC, I want to full-port with a tight stop so
 *    the daily drawdown is not breached. How much can I risk, how much
 *    can I make, what does that do to the 40% rule?"
 *
 * Identities:
 *   maxNotional     = equity × leverage
 *   slPct(dailyDD)  = dailyDrawdown / maxNotional
 *   slPct(risk)     = riskDollars / notional
 *   win             = risk × rewardRisk
 *
 * A 15x full-port that uses the entire daily DD as 1R prints a 2R winner
 * equal to 2 × daily DD. On E8 One 100K (daily DD $4,000) that is $8,000
 * — exactly 40% of a $20k target, or 100% of an $8k target. That is how
 * a "tight SL full-port" becomes a consistency lock.
 *
 * Tradable floor: a stop tighter than 0.35% is noise, not a stop. If the
 * full-port SL vs planned risk is below that, the realistic book is a
 * smaller notional, not 15x.
 */

export type PortInput = {
  equity: number;
  leverage: number;
  price: number;
  dailyDrawdown: number;
  budgetCap: number;
  riskDollars: number;
  rewardRisk: number;
  maxBestDay: number;
  todayHeadroom: number | null;
  targetProfit: number;
};

export type PortResult = {
  leverage: number;
  maxNotional: number;
  requiredMargin: number;
  slPctVsDailyDd: number;
  slDistanceVsDailyDd: number;
  slPctVsRisk: number;
  slDistanceVsRisk: number;
  tpPctVsRisk: number;
  tpDistanceVsRisk: number;
  fullPort1R: number;
  fullPortWin: number;
  fullPortWinShareOfTarget: number | null;
  fullPortBreachesMaxDay: boolean;
  fullPortLocksCycle: boolean;
  tradableSlPct: number;
  tradableNotional: number;
  tradableLeverage: number;
  tradableWin: number;
  budgetCapNotional: number;
  realistic: "full-port" | "size-down" | "do-not-full-port";
  headline: string;
  body: string;
};

const MIN_TRADABLE_SL = 0.0035; // 0.35%

export function sizeFullPort(input: PortInput): PortResult {
  const lev = Math.max(1, input.leverage);
  const equity = Math.max(1, input.equity);
  const price = Math.max(1e-8, input.price);
  const maxNotional = equity * lev;
  const requiredMargin = maxNotional / lev; // = equity when truly full-port
  const daily = Math.max(0, input.dailyDrawdown);
  const risk = Math.max(1, input.riskDollars);
  const rr = Math.max(0.25, input.rewardRisk);

  const slPctVsDailyDd = daily > 0 ? daily / maxNotional : 0;
  const slPctVsRisk = risk / maxNotional;
  const slDistanceVsDailyDd = price * slPctVsDailyDd;
  const slDistanceVsRisk = price * slPctVsRisk;
  const tpPctVsRisk = slPctVsRisk * rr;
  const tpDistanceVsRisk = slDistanceVsRisk * rr;

  const fullPort1R = daily;
  const fullPortWin = fullPort1R * rr;
  const fullPortWinShareOfTarget = input.targetProfit > 0 ? fullPortWin / input.targetProfit : null;
  const fullPortBreachesMaxDay = fullPortWin > input.maxBestDay + 1e-6;
  const fullPortLocksCycle =
    fullPortWinShareOfTarget != null && fullPortWinShareOfTarget > 0.4 + 1e-9;

  const tradableSlPct = MIN_TRADABLE_SL;
  const tradableNotional = Math.min(maxNotional, risk / tradableSlPct);
  const tradableLeverage = tradableNotional / equity;
  const tradableWin = risk * rr;

  const budgetCapNotional = input.budgetCap > 0 ? Math.min(maxNotional, input.budgetCap * lev) : maxNotional;

  let realistic: PortResult["realistic"] = "full-port";
  if (fullPortBreachesMaxDay || fullPortLocksCycle) realistic = "do-not-full-port";
  else if (slPctVsRisk < MIN_TRADABLE_SL) realistic = "size-down";

  const headline =
    realistic === "do-not-full-port"
      ? "Do not full-port this target"
      : realistic === "size-down"
        ? "Full-port SL is not tradable — size down"
        : "Full-port fits, still keep the stop inside daily DD";

  const body = copyFor(realistic, {
    lev,
    maxNotional,
    slPctVsDailyDd,
    slDistanceVsDailyDd,
    slPctVsRisk,
    slDistanceVsRisk,
    fullPortWin,
    maxBestDay: input.maxBestDay,
    tradableNotional,
    tradableLeverage,
    tradableWin,
    price,
    risk,
    rr,
  });

  return {
    leverage: lev,
    maxNotional,
    requiredMargin,
    slPctVsDailyDd,
    slDistanceVsDailyDd,
    slPctVsRisk,
    slDistanceVsRisk,
    tpPctVsRisk,
    tpDistanceVsRisk,
    fullPort1R,
    fullPortWin,
    fullPortWinShareOfTarget,
    fullPortBreachesMaxDay,
    fullPortLocksCycle,
    tradableSlPct,
    tradableNotional,
    tradableLeverage,
    tradableWin,
    budgetCapNotional,
    realistic,
    headline,
    body,
  };
}

function copyFor(
  kind: PortResult["realistic"],
  n: {
    lev: number;
    maxNotional: number;
    slPctVsDailyDd: number;
    slDistanceVsDailyDd: number;
    slPctVsRisk: number;
    slDistanceVsRisk: number;
    fullPortWin: number;
    maxBestDay: number;
    tradableNotional: number;
    tradableLeverage: number;
    tradableWin: number;
    price: number;
    risk: number;
    rr: number;
  },
): string {
  const slDd = (n.slPctVsDailyDd * 100).toFixed(3);
  const slR = (n.slPctVsRisk * 100).toFixed(3);
  if (kind === "do-not-full-port") {
    return `${n.lev}x full-port notional ${fmt(n.maxNotional)}. A ${n.rr.toFixed(1)}R winner that uses the whole daily drawdown as 1R prints ${fmt(n.fullPortWin)} — above the ${fmt(n.maxBestDay)} best-day ceiling. That is the lottery ticket the 40% rule exists to stop. Size the book to ${fmt(n.tradableNotional)} (${n.tradableLeverage.toFixed(2)}x) so a full winner is ${fmt(n.tradableWin)}.`;
  }
  if (kind === "size-down") {
    return `Protecting ${fmt(n.risk)} of risk on ${fmt(n.maxNotional)} of ${n.lev}x notional needs a ${slR}% stop ($${n.slDistanceVsRisk.toFixed(2)} at ${fmt(n.price)}). That is inside the spread. A tradable 0.35% stop on the same risk is ${fmt(n.tradableNotional)} notional (${n.tradableLeverage.toFixed(2)}x), ${n.rr.toFixed(1)}R = ${fmt(n.tradableWin)}. Daily DD still binds at a ${slDd}% move ($${n.slDistanceVsDailyDd.toFixed(2)}).`;
  }
  return `${n.lev}x full-port ${fmt(n.maxNotional)}. Tight stop so daily DD is not tagged: ${slDd}% ($${n.slDistanceVsDailyDd.toFixed(2)}). Planned risk ${fmt(n.risk)} sits inside that. ${n.rr.toFixed(1)}R = ${fmt(n.risk * n.rr)}.`;
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
