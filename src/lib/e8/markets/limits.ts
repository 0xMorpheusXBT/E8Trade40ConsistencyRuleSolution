/**
 * E8 Terminal contract limits (HIP-3 / HL perps).
 *
 * Observed 2026-09-04 on trade.e8markets.com Markets:
 *   Indices (SP500, XYZ100, JP225, …)  15x  $1.30M
 *   Energy  (CL, BRENTOIL, NATGAS)     15x  $1.30M
 *   Metals  (GOLD, SILVER, PLATINUM,
 *            PALLADIUM)                15x  $1.30M
 *   Copper                             8x   $1.30M
 * BTC / ETH / SOL on this desk:        15x
 * HIP-3 FX (EUR, JPY / USDJPY):        25x  $1.30M
 * HIP-3 stocks / equities:             5x   $1.30M
 * Other commodities (Aluminium, Corn,
 * Wheat, Uranium):                     8x   $1.30M
 */

export const HIP3_MAX_NOTIONAL = 1_300_000;

const CRYPTO_15X = new Set(["BTC", "ETH", "SOL"]);
const INDEX_15X = new Set([
  "SP500",
  "XYZ100",
  "JP225",
  "ES",
  "NQ",
  "KR200",
  "NIFTY",
  "IBOV",
  "VIX",
  "VOL",
  "H100",
]);
const ENERGY_15X = new Set(["CL", "BRENTOIL", "NATGAS", "TTF"]);
const PRECIOUS_15X = new Set(["GOLD", "SILVER", "PLATINUM", "PALLADIUM"]);
const COMMODITY_8X = new Set(["COPPER", "ALUMINIUM", "CORN", "WHEAT", "URANIUM"]);
const FX_25X = new Set(["EUR", "JPY", "EURUSD", "USDJPY", "DXY", "KRW", "GBP"]);

export type LimitInput = {
  symbol: string;
  assetClass: string;
  book?: string;
  dex?: string;
  maxLeverage?: number;
};

export type ContractLimits = {
  maxLeverage: number;
  /** Venue position cap. Infinity = no cap (native crypto). */
  maxNotional: number;
};

function ticker(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  const i = s.lastIndexOf(":");
  return i >= 0 ? s.slice(i + 1) : s.replace(/^HL_(PERP|HIP3_XYZ)_/, "");
}

export function isHip3(a: LimitInput): boolean {
  return a.book === "hip3-xyz" || a.book === "hip-3" || a.dex === "xyz";
}

export function contractLimits(a: LimitInput): ContractLimits {
  const s = ticker(a.symbol);
  const hip3 = isHip3(a);
  const hip3Cap = hip3 ? HIP3_MAX_NOTIONAL : Number.POSITIVE_INFINITY;

  if (CRYPTO_15X.has(s)) return { maxLeverage: 15, maxNotional: hip3Cap };
  if (INDEX_15X.has(s) || a.assetClass === "index") {
    return { maxLeverage: 15, maxNotional: hip3 ? HIP3_MAX_NOTIONAL : hip3Cap };
  }
  if (ENERGY_15X.has(s)) return { maxLeverage: 15, maxNotional: HIP3_MAX_NOTIONAL };
  if (PRECIOUS_15X.has(s)) return { maxLeverage: 15, maxNotional: HIP3_MAX_NOTIONAL };
  if (COMMODITY_8X.has(s)) return { maxLeverage: 8, maxNotional: HIP3_MAX_NOTIONAL };
  if (a.assetClass === "metal") return { maxLeverage: 8, maxNotional: HIP3_MAX_NOTIONAL };
  if (a.assetClass === "energy") return { maxLeverage: 15, maxNotional: HIP3_MAX_NOTIONAL };
  if (FX_25X.has(s) || a.assetClass === "fx") return { maxLeverage: 25, maxNotional: HIP3_MAX_NOTIONAL };
  if (a.assetClass === "equity") return { maxLeverage: 5, maxNotional: HIP3_MAX_NOTIONAL };
  if (hip3) return { maxLeverage: 5, maxNotional: HIP3_MAX_NOTIONAL };

  const listed = a.maxLeverage && a.maxLeverage > 0 ? a.maxLeverage : 5;
  return { maxLeverage: listed, maxNotional: Number.POSITIVE_INFINITY };
}

export function sizedNotional(
  equity: number,
  leverage: number,
  marginUse: number,
  maxNotional: number,
): number {
  const raw = Math.max(0, equity) * Math.max(1, leverage) * Math.min(1, Math.max(0, marginUse));
  if (!Number.isFinite(maxNotional) || maxNotional <= 0) return raw;
  return Math.min(raw, maxNotional);
}
