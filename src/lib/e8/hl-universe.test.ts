import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findHlAsset,
  HL_COUNT,
  HL_NATIVE_COUNT,
  HL_UNIVERSE,
  searchHlAssets,
  XYZ_COUNT,
} from "./hl-universe.ts";

describe("Hyperliquid universe on E8", () => {
  it("lists the full active HL book (native + HIP-3 dexes)", () => {
    assert.ok(HL_COUNT >= 400, `expected ≥400 markets, got ${HL_COUNT}`);
    assert.equal(HL_UNIVERSE.length, HL_COUNT);
    assert.ok(HL_NATIVE_COUNT >= 150);
    assert.ok(XYZ_COUNT >= 100);
  });

  it("includes the tape from the 2026-09-04 session", () => {
    assert.equal(findHlAsset("BTC")?.dex, "native");
    assert.equal(findHlAsset("ETH")?.symbol, "ETH");
    assert.equal(findHlAsset("HYPE")?.symbol, "HYPE");
    assert.equal(findHlAsset("SOL")?.symbol, "SOL");
    assert.equal(findHlAsset("SP500")?.hl, "xyz:SP500");
    assert.equal(findHlAsset("CL")?.hl, "xyz:CL");
    assert.equal(findHlAsset("GOLD")?.assetClass, "metal");
  });

  it("search ranks exact tickers first", () => {
    const hits = searchHlAssets("SP500", 10);
    assert.equal(hits[0]?.symbol, "SP500");
    const gold = searchHlAssets("GOLD", 10);
    assert.ok(gold.some((a) => a.symbol === "GOLD"));
    assert.ok(gold.length >= 2, "GOLD exists on multiple HIP-3 dexes");
  });

  it("venue toggle isolates Hyperliquid vs Trade.XYZ", () => {
    const hl = searchHlAssets("", 20, "hl");
    assert.ok(hl.every((a) => a.dex === "native"));
    const xyz = searchHlAssets("", 80, "xyz");
    assert.ok(xyz.every((a) => a.dex === "xyz"));
    assert.ok(xyz.some((a) => a.symbol === "SP500"));
    assert.ok(xyz.some((a) => a.symbol === "NVDA"));
    assert.equal(searchHlAssets("BTC", 5, "xyz").some((a) => a.symbol === "BTC"), false);
  });
});
