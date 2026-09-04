import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { remainingForStage, planAttack } from "./attack.ts";
import { HIP3_INSTRUMENTS, getInstrument } from "./instruments.ts";
import { TAPE_FALLBACK } from "./tape.ts";

const btc = getInstrument("btc-hl-15x");
const sp = getInstrument("sp500-hl-15x");
const copper = getInstrument("copper-hl-8x");

describe("remaining by stage", () => {
  it("challenge remaining is profit target minus booked — no 40% math", () => {
    assert.equal(remainingForStage({ stage: "challenge", profitTarget: 9000, cycleProfit: 2000, effectiveTarget: 9000 }), 7000);
  });
  it("performance remaining uses the raised-bar effective target", () => {
    assert.equal(remainingForStage({ stage: "performance", profitTarget: 8000, cycleProfit: 3100, effectiveTarget: 3750 }), 650);
  });
});

describe("plan of attack", () => {
  it("100K eval sprint: 15x BTC needs ~0.60% to pass $9k in one ticket", () => {
    const plan = planAttack(
      {
        stage: "challenge",
        size: 100_000,
        equity: 100_000,
        remaining: 9_000,
        maxPrint: null,
        dailyDrawdown: 4_000,
        winRate: 0.55,
        rewardRisk: 2,
        marginUse: 1,
        persona: "sprint",
      },
      [btc, sp, copper],
      TAPE_FALLBACK,
    );
    const row = plan.rows.find((r) => r.symbol === "BTC")!;
    assert.equal(row.notional, 1_500_000);
    assert.ok(Math.abs(row.movePct - 0.006) < 1e-6);
    assert.ok(row.atrUnits < 1, "BTC 4h expansion covers a 0.60% sprint");
    assert.equal(row.fit, "one-print");
    assert.ok(row.slPct > 0 && row.slPct < 0.01);
  });

  it("100K funded $8k: full-port 4h on BTC locks 40%; SP500 is the measured path", () => {
    const sprint = planAttack(
      {
        stage: "performance",
        size: 100_000,
        equity: 100_000,
        remaining: 8_000,
        maxPrint: 3_200,
        dailyDrawdown: 4_000,
        winRate: 0.55,
        rewardRisk: 2,
        marginUse: 1,
        persona: "sprint",
      },
      [btc, sp],
      TAPE_FALLBACK,
    );
    const btcRow = sprint.rows.find((r) => r.symbol === "BTC")!;
    assert.equal(btcRow.fit, "locks-40");

    const measured = planAttack(
      {
        stage: "performance",
        size: 100_000,
        equity: 100_000,
        remaining: 8_000,
        maxPrint: 3_200,
        dailyDrawdown: 4_000,
        winRate: 0.55,
        rewardRisk: 2,
        marginUse: 0.2,
        persona: "measured",
      },
      HIP3_INSTRUMENTS,
      TAPE_FALLBACK,
    );
    assert.ok(measured.pick);
    assert.notEqual(measured.pick?.fit, "locks-40");
    assert.ok((measured.pick?.winningTrades ?? 0) >= 1);
  });

  it("Copper books at 8x, not 15x", () => {
    const plan = planAttack(
      {
        stage: "challenge",
        size: 100_000,
        equity: 100_000,
        remaining: 9_000,
        maxPrint: null,
        dailyDrawdown: 4_000,
        winRate: 0.55,
        rewardRisk: 2,
        marginUse: 1,
        persona: "vol",
      },
      [copper],
      TAPE_FALLBACK,
    );
    assert.equal(plan.rows[0].leverage, 8);
    assert.equal(plan.rows[0].notional, 800_000);
  });
});
