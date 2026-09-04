import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoClosedTrades, demoHistory, netFromGross, parseClosedTrades, rollupDays } from "./history.ts";
import { evaluateConsistency } from "./consistency.ts";

describe("Trade History net of fees", () => {
  it("net = profit − fee", () => {
    assert.equal(netFromGross(2310, 70), 2240);
    assert.equal(netFromGross(-280, 40), -320);
  });

  it("$500K demo days match the recorded tape (net, not gross)", () => {
    const trades = demoClosedTrades(500_000);
    const days = rollupDays(trades);
    assert.equal(days.length, 4);
    assert.equal(days[0].closedPnl, 2240);
    assert.equal(days[0].grossPnl, 2310);
    assert.equal(days[0].fees, 70);
    assert.equal(days[1].closedPnl, 1810);
    assert.equal(days[2].closedPnl, 2560);
    assert.equal(days[2].tradeCount, 2);
    assert.equal(days[3].closedPnl, 920);
    const cycle = days.reduce((a, d) => a + d.closedPnl, 0);
    assert.equal(cycle, 2240 + 1810 + 2560 + 920);
  });

  it("40% engine consumes Net PNL, not Profit", () => {
    const snap = evaluateConsistency({
      ratio: 0.4,
      todayDate: demoHistory(500_000).days.at(-1)!.date,
      liveOpenPnl: 0,
      days: rollupDays(demoClosedTrades(500_000)).map((d) => ({ date: d.date, closedPnl: d.closedPnl })),
    });
    assert.equal(snap.cycleProfit, 7530);
    assert.equal(snap.bestDay, 2560);
    assert.ok(snap.bestDayShare != null && snap.bestDayShare < 0.4);
    assert.equal(snap.eligible, true);
  });

  it("MCP-shaped orders parse Profit / Fee / Net PNL", () => {
    const trades = parseClosedTrades({
      result: {
        orders: [
          {
            id: "o1",
            symbol: "SP500",
            side: "buy",
            notional: 1_239_328,
            entry: 7747.07,
            exit: 7750,
            profit: 468.8,
            fee: 18.8,
            netPnl: 450,
            status: "FILLED",
            openedAt: "2026-09-01T10:00:00.000Z",
            closedAt: "2026-09-01T11:00:00.000Z",
          },
        ],
      },
    });
    assert.equal(trades.length, 1);
    assert.equal(trades[0].side, "long");
    assert.equal(trades[0].profit, 468.8);
    assert.equal(trades[0].fee, 18.8);
    assert.equal(trades[0].netPnl, 450);
    assert.equal(rollupDays(trades)[0].closedPnl, 450);
  });
});
