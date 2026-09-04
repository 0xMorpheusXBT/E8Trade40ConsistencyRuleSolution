/**
 * 40% Best Day Rule engine.
 *
 * Source of truth: E8 help article 10450125.
 *
 *   "With a 40% Best Day Rule, you must ensure that no single trading day
 *    exceeds more than 40% of your total generated profits."
 *
 *   Total profit must be ≥ Best day ÷ 0.40
 *
 * Evaluated on payout request during the Performance stage. Exceeding it
 * does not breach the account — you keep trading until the best day is
 * diluted. After a payout, Current Best Day and Current Performance reset;
 * leftover buffer from the prior cycle is excluded.
 *
 * Splitting a winning position across days to game the rule is prohibited.
 */

export type DayPnl = { date: string; closedPnl: number };

export type AlertLevel = "ok" | "watch" | "danger" | "breach" | "first-day" | "na";

export type ConsistencySnapshot = {
  ratio: number;
  cycleProfit: number;
  bestDay: number;
  bestDayDate: string | null;
  todayBooked: number;
  todayProjected: number;
  projectedCycleProfit: number;
  projectedBestDay: number;
  bestDayShare: number | null;
  projectedShare: number | null;
  eligible: boolean;
  projectedEligible: boolean;
  minTotalRequired: number;
  remainingToFulfill: number;
  projectedRemaining: number;
  profitExToday: number;
  maxAllowedToday: number | null;
  todayHeadroom: number | null;
  liveHeadroom: number | null;
  liveWorsensBestDay: boolean;
  liveWouldBreach: boolean;
  alert: AlertLevel;
  closeNow: boolean;
  scaleOut: boolean;
  /** Extra open P&L that would land exactly on the ratio if today is/becomes best. */
  dollarsToFortyOnLive: number | null;
};

export function isoToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function groupDays(days: DayPnl[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const day of days) {
    map.set(day.date, (map.get(day.date) ?? 0) + day.closedPnl);
  }
  return map;
}

function share(best: number, total: number): number | null {
  if (total <= 0) return null;
  return best / total;
}

/**
 * Max booked P&L allowed today so that today ≤ r of (other-day profit + today).
 * Derived: today ≤ r/(1-r) * profitExToday. At r=0.40 this is 2/3 of other-day profit.
 * Null when there is no other-day profit (first day of the cycle) — any print is 100%.
 */
export function maxTodayFromOther(profitExToday: number, ratio: number): number | null {
  if (ratio <= 0 || ratio >= 1) return null;
  if (profitExToday <= 0) return null;
  return (ratio / (1 - ratio)) * profitExToday;
}

export function evaluateConsistency(input: {
  ratio: number;
  days: DayPnl[];
  todayDate: string;
  liveOpenPnl: number;
}): ConsistencySnapshot {
  const ratio = input.ratio;
  const byDate = groupDays(input.days);
  const cycleProfit = [...byDate.values()].reduce((a, b) => a + b, 0);

  let bestDay = -Infinity;
  let bestDayDate: string | null = null;
  for (const [date, pnl] of byDate) {
    if (pnl > bestDay) {
      bestDay = pnl;
      bestDayDate = date;
    }
  }
  if (byDate.size === 0) {
    bestDay = 0;
    bestDayDate = null;
  }

  const todayBooked = byDate.get(input.todayDate) ?? 0;
  const profitExToday = cycleProfit - todayBooked;
  const todayProjected = todayBooked + input.liveOpenPnl;
  const projectedCycleProfit = cycleProfit + input.liveOpenPnl;

  const bestExToday = (() => {
    let m = -Infinity;
    for (const [date, pnl] of byDate) {
      if (date === input.todayDate) continue;
      if (pnl > m) m = pnl;
    }
    return m === -Infinity ? 0 : m;
  })();

  const projectedBestDay = Math.max(bestExToday, todayProjected, 0);
  const bestDayShare = share(bestDay, cycleProfit);
  const projectedShare = share(projectedBestDay, projectedCycleProfit);

  const minTotalRequired = bestDay > 0 ? bestDay / ratio : 0;
  const remainingToFulfill = Math.max(0, minTotalRequired - cycleProfit);
  const projectedMinRequired = projectedBestDay > 0 ? projectedBestDay / ratio : 0;
  const projectedRemaining = Math.max(0, projectedMinRequired - projectedCycleProfit);

  const eligible = cycleProfit > 0 && bestDay > 0 && bestDay <= ratio * cycleProfit + 1e-9;
  const projectedEligible =
    projectedCycleProfit > 0 &&
    projectedBestDay > 0 &&
    projectedBestDay <= ratio * projectedCycleProfit + 1e-9;

  const maxAllowedToday = maxTodayFromOther(profitExToday, ratio);
  const todayHeadroom = maxAllowedToday == null ? null : maxAllowedToday - todayBooked;
  const liveHeadroom = maxAllowedToday == null ? null : maxAllowedToday - todayProjected;

  const liveWorsensBestDay = todayProjected > bestExToday && input.liveOpenPnl > 0;
  const hasOtherProfit = profitExToday > 0;
  const liveWouldBreach =
    hasOtherProfit &&
    liveWorsensBestDay &&
    projectedShare != null &&
    projectedShare > ratio + 1e-9;

  const dollarsToFortyOnLive =
    maxAllowedToday == null ? null : maxAllowedToday - todayProjected;

  const firstDay = !hasOtherProfit && (todayProjected > 0 || cycleProfit > 0);

  let alert: AlertLevel = "na";
  if (cycleProfit <= 0 && todayProjected <= 0) {
    alert = "na";
  } else if (firstDay) {
    alert = "first-day";
  } else if (liveWouldBreach || (projectedShare != null && projectedShare > ratio + 1e-9 && liveWorsensBestDay)) {
    alert = "breach";
  } else if (!eligible && remainingToFulfill > 0) {
    const near = bestDayShare != null && bestDayShare > ratio * 0.95;
    alert = near ? "danger" : "watch";
  } else if (projectedShare != null && projectedShare >= ratio * 0.9) {
    alert = "danger";
  } else if (projectedShare != null && projectedShare >= ratio * 0.8) {
    alert = "watch";
  } else if (eligible) {
    alert = "ok";
  } else {
    alert = "watch";
  }

  const closeNow = alert === "breach" || (liveWouldBreach && input.liveOpenPnl > 0);
  const scaleOut =
    !closeNow &&
    liveHeadroom != null &&
    input.liveOpenPnl > 0 &&
    liveHeadroom < input.liveOpenPnl * 0.35 &&
    liveWorsensBestDay;

  return {
    ratio,
    cycleProfit,
    bestDay: bestDay === -Infinity ? 0 : bestDay,
    bestDayDate,
    todayBooked,
    todayProjected,
    projectedCycleProfit,
    projectedBestDay,
    bestDayShare,
    projectedShare,
    eligible,
    projectedEligible,
    minTotalRequired,
    remainingToFulfill,
    projectedRemaining,
    profitExToday,
    maxAllowedToday,
    todayHeadroom,
    liveHeadroom,
    liveWorsensBestDay,
    liveWouldBreach,
    alert,
    closeNow,
    scaleOut,
    dollarsToFortyOnLive,
  };
}

/** Dollars of additional (non-best-day) profit still required. */
export function remainingFromBest(bestDay: number, cycleProfit: number, ratio: number): number {
  if (bestDay <= 0) return 0;
  return Math.max(0, bestDay / ratio - cycleProfit);
}
