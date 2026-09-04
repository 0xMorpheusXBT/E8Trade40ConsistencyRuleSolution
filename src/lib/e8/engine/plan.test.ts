import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateConsistency, maxTodayFromOther, remainingFromBest } from "./consistency.ts";
import { defaultTargetProfit, planCycle } from "./plan.ts";
import { sizeFullPort } from "./port.ts";

describe("40% identities (help 10450125)", () => {
  it("example A is eligible", () => {
    const snap = evaluateConsistency({
      ratio: 0.4,
      todayDate: "2026-01-05",
      liveOpenPnl: 0,
      days: [
        { date: "2026-01-01", closedPnl: 500 },
        { date: "2026-01-02", closedPnl: 550 },
        { date: "2026-01-03", closedPnl: -150 },
        { date: "2026-01-04", closedPnl: 600 },
        { date: "2026-01-05", closedPnl: 400 },
      ],
    });
    assert.equal(snap.cycleProfit, 1900);
    assert.equal(snap.bestDay, 600);
    assert.equal(snap.eligible, true);
  });

  it("example B remaining is $650, target $3,750", () => {
    const snap = evaluateConsistency({
      ratio: 0.4,
      todayDate: "2026-01-04",
      liveOpenPnl: 0,
      days: [
        { date: "2026-01-01", closedPnl: 1100 },
        { date: "2026-01-02", closedPnl: 1500 },
        { date: "2026-01-03", closedPnl: 900 },
        { date: "2026-01-04", closedPnl: -400 },
      ],
    });
    assert.equal(snap.cycleProfit, 3100);
    assert.equal(snap.bestDay, 1500);
    assert.equal(snap.eligible, false);
    assert.equal(snap.minTotalRequired, 3750);
    assert.equal(remainingFromBest(1500, 3100, 0.4), 650);
  });

  it("max today is 2/3 of other-day profit at 40%", () => {
    const max = maxTodayFromOther(6500, 0.4);
    assert.ok(max != null);
    assert.equal(Math.round(max * 100) / 100, 4333.33);
  });

  it("first day never closeNow", () => {
    const snap = evaluateConsistency({
      ratio: 0.4,
      todayDate: "2026-01-01",
      liveOpenPnl: 12_000,
      days: [],
    });
    assert.equal(snap.alert, "first-day");
    assert.equal(snap.closeNow, false);
  });
});

describe("funded target planner", () => {
  const base = {
    accountSize: 100_000,
    targetProfit: 8_000,
    ratio: 0.4,
    winRate: 0.55,
    rewardRisk: 2,
    tradesPerDay: 2,
    dailyDrawdown: 4_000,
    dailyProfitCap: null as number | null,
    budgetCap: 5_000,
    maxDrawdown: 6_000,
    minPayout: 2_001,
    payoutPct: 80,
    cycleProfit: 0,
    bestDay: 0,
    todayBooked: 0,
  };

  it("100K · $8k target · 40% → max day $3,200, three days of ~$2,667", () => {
    const p = planCycle(base);
    assert.equal(p.maxBestDay, 3_200);
    assert.equal(p.minEqualDays, 3);
    assert.equal(Math.round(p.idealDayProfit), 2667);
    assert.equal(p.takeHome, 6_400);
    assert.equal(p.path, "three-similar");
    assert.ok(p.suggestedRisk <= 500); // 0.5% of size binds
    assert.ok(p.suggestedWin <= p.maxBestDay);
    assert.ok(p.winningTradesToTarget >= 3);
  });

  it("default target is 8% of size or 3× min payout", () => {
    assert.equal(defaultTargetProfit(100_000, 2_001), 8_000);
    assert.equal(defaultTargetProfit(5_000, 101), 400);
    assert.equal(defaultTargetProfit(500_000, 10_001), 40_000);
  });

  it("a $5k winner on an $8k target raises the bar to $12,500", () => {
    const p = planCycle({ ...base, cycleProfit: 5_000, bestDay: 5_000, todayBooked: 5_000 });
    assert.equal(p.barRaised, true);
    assert.equal(p.effectiveTarget, 12_500);
    assert.equal(p.remainingToTarget, 7_500);
    assert.equal(p.path, "raised-bar");
    assert.ok(p.remainingWinningTrades > 0);
  });

  it("min payout binds when target is too small", () => {
    const p = planCycle({ ...base, targetProfit: 500 });
    assert.ok(p.warnings.some((w) => w.includes("2,001")));
    assert.equal(p.path, "min-payout");
  });
});

describe("full-port 15x BTC on 100K", () => {
  it("tight SL vs $4k daily DD is 0.267% on $1.5M notional", () => {
    const port = sizeFullPort({
      equity: 100_000,
      leverage: 15,
      price: 110_250,
      dailyDrawdown: 4_000,
      budgetCap: 5_000,
      riskDollars: 500,
      rewardRisk: 2,
      maxBestDay: 3_200,
      todayHeadroom: null,
      targetProfit: 8_000,
    });
    assert.equal(port.maxNotional, 1_500_000);
    assert.ok(Math.abs(port.slPctVsDailyDd - 4000 / 1_500_000) < 1e-12);
    assert.ok(Math.abs(port.slPctVsDailyDd * 100 - 0.2666) < 0.002);
    assert.equal(port.fullPortWin, 8_000);
    assert.equal(port.fullPortLocksCycle, true);
    assert.equal(port.realistic, "do-not-full-port");
    assert.ok(port.tradableNotional < port.maxNotional);
    assert.ok(port.tradableLeverage < 2);
  });
});
