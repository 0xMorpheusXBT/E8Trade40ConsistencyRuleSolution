import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contractLimits, HIP3_MAX_NOTIONAL, sizedNotional } from "./limits.ts";

describe("E8 HIP-3 contract (Markets screenshots 2026-09-04)", () => {
  it("BTC ETH SOL are 15x", () => {
    for (const s of ["BTC", "ETH", "SOL"]) {
      const c = contractLimits({ symbol: s, assetClass: "crypto", book: "hl-perp" });
      assert.equal(c.maxLeverage, 15, s);
      assert.equal(c.maxNotional, Number.POSITIVE_INFINITY);
    }
  });

  it("indices 15x $1.3M", () => {
    for (const s of ["SP500", "XYZ100", "JP225", "KR200"]) {
      const c = contractLimits({ symbol: s, assetClass: "index", book: "hip3-xyz", dex: "xyz" });
      assert.equal(c.maxLeverage, 15, s);
      assert.equal(c.maxNotional, HIP3_MAX_NOTIONAL);
    }
  });

  it("energy 15x $1.3M", () => {
    for (const s of ["CL", "BRENTOIL", "NATGAS"]) {
      const c = contractLimits({ symbol: s, assetClass: "energy", book: "hip3-xyz", dex: "xyz" });
      assert.equal(c.maxLeverage, 15, s);
      assert.equal(c.maxNotional, HIP3_MAX_NOTIONAL);
    }
  });

  it("precious metals 15x $1.3M, copper 8x $1.3M", () => {
    for (const s of ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"]) {
      const c = contractLimits({ symbol: s, assetClass: "metal", book: "hip3-xyz", dex: "xyz" });
      assert.equal(c.maxLeverage, 15, s);
      assert.equal(c.maxNotional, HIP3_MAX_NOTIONAL);
    }
    const cu = contractLimits({ symbol: "COPPER", assetClass: "metal", book: "hip3-xyz", dex: "xyz" });
    assert.equal(cu.maxLeverage, 8);
    assert.equal(cu.maxNotional, HIP3_MAX_NOTIONAL);
  });

  it("EUR / JPY 25x $1.3M", () => {
    for (const s of ["EUR", "JPY"]) {
      const c = contractLimits({ symbol: s, assetClass: "fx", book: "hip3-xyz", dex: "xyz" });
      assert.equal(c.maxLeverage, 25, s);
      assert.equal(c.maxNotional, HIP3_MAX_NOTIONAL);
    }
  });

  it("equities 5x $1.3M", () => {
    const nvda = contractLimits({ symbol: "NVDA", assetClass: "equity", book: "hip3-xyz", dex: "xyz" });
    assert.equal(nvda.maxLeverage, 5);
    assert.equal(nvda.maxNotional, HIP3_MAX_NOTIONAL);
  });

  it("sized notional clips HIP-3 at $1.3M, leaves 100k copper at 8x", () => {
    assert.equal(sizedNotional(100_000, 15, 1, HIP3_MAX_NOTIONAL), HIP3_MAX_NOTIONAL);
    assert.equal(sizedNotional(100_000, 8, 1, HIP3_MAX_NOTIONAL), 800_000);
    assert.equal(sizedNotional(500_000, 8, 1, HIP3_MAX_NOTIONAL), HIP3_MAX_NOTIONAL);
    assert.equal(sizedNotional(100_000, 15, 1, Number.POSITIVE_INFINITY), 1_500_000);
  });
});
