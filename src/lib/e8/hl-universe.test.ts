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

describe("E8 Terminal Hyperliquid book", () => {
  it("imports every HL_PERP and every HL_HIP3_XYZ (csv rows 73–380)", () => {
    assert.equal(HL_COUNT, 308);
    assert.equal(HL_NATIVE_COUNT, 227);
    assert.equal(XYZ_COUNT, 81);
    assert.equal(HL_UNIVERSE.length, HL_COUNT);
    assert.ok(HL_UNIVERSE.every((a) => a.book === "hl-perp" || a.book === "hip3-xyz"));
    assert.equal(
      HL_UNIVERSE.filter((a) => a.terminalSymbol.startsWith("HL_HIP3_PARA_")).length,
      0,
    );
  });

  it("resolves native perps and Trade.XYZ HIP-3 by ticker and terminal symbol", () => {
    assert.equal(findHlAsset("BTC")?.dex, "native");
    assert.equal(findHlAsset("HL_PERP_BTC")?.symbol, "BTC");
    assert.equal(findHlAsset("ETH")?.symbol, "ETH");
    assert.equal(findHlAsset("HYPE")?.symbol, "HYPE");
    assert.equal(findHlAsset("SOL")?.symbol, "SOL");
    assert.equal(findHlAsset("SP500")?.hl, "xyz:SP500");
    assert.equal(findHlAsset("HL_HIP3_XYZ_SP500")?.symbol, "SP500");
    assert.equal(findHlAsset("CL")?.hl, "xyz:CL");
    assert.equal(findHlAsset("GOLD")?.assetClass, "metal");
    assert.equal(findHlAsset("COPPER")?.book, "hip3-xyz");
  });

  it("search ranks exact tickers first", () => {
    const hits = searchHlAssets("SP500", 10);
    assert.equal(hits[0]?.symbol, "SP500");
    const gold = searchHlAssets("GOLD", 10);
    assert.equal(gold[0]?.symbol, "GOLD");
    assert.equal(gold[0]?.dex, "xyz");
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
