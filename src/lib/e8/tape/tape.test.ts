import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CLASS_RANGE, TAPE_FALLBACK, putMarket, tapeFor, type MarketTape } from "./tape.ts";
import { findHlAsset, HL_COUNT, XYZ_COUNT, HL_NATIVE_COUNT } from "../markets/hl-universe.ts";

describe("tape index", () => {
  it("resolves SP500 via symbol, hl and xyz: prefix on the fallback", () => {
    assert.equal(tapeFor("SP500", TAPE_FALLBACK)?.symbol, "SP500");
    assert.equal(tapeFor("xyz:SP500", TAPE_FALLBACK)?.hl, "xyz:SP500");
    assert.ok((tapeFor("SP500", TAPE_FALLBACK)?.mark ?? 0) > 0);
  });

  it("indexes a Trade.XYZ equity so Live Trade can hydrate NVDA", () => {
    const markets: Record<string, MarketTape> = {};
    putMarket(markets, {
      symbol: "NVDA",
      hl: "xyz:NVDA",
      mark: 177.4,
      prevDayPx: 170,
      dayPct: 0.0435,
      dayNtlVlm: 12_000_000,
      range4h: 0.012,
      range24h: 0.018,
      vol4h: 2_000_000,
      funding: 0.0001,
      source: "live",
    });
    const snap = { at: "x", source: "live" as const, markets };
    assert.equal(tapeFor("NVDA", snap)?.mark, 177.4);
    assert.equal(tapeFor("xyz:NVDA", snap)?.mark, 177.4);
    assert.equal(tapeFor("nvda", snap)?.hl, "xyz:NVDA");
  });

  it("E8 book still has 227 native + 81 xyz", () => {
    assert.equal(HL_NATIVE_COUNT, 227);
    assert.equal(XYZ_COUNT, 81);
    assert.equal(HL_COUNT, 308);
    assert.equal(findHlAsset("xyz:NVDA")?.symbol, "NVDA");
    assert.equal(findHlAsset("HL_HIP3_XYZ_SP500")?.hl, "xyz:SP500");
    assert.equal(findHlAsset("BTC")?.dex, "native");
  });

  it("has a range default for equities", () => {
    assert.ok(CLASS_RANGE.equity.range4h > 0);
  });
});
