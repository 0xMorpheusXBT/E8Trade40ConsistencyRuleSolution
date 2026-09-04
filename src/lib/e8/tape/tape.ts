import type { AssetClass } from "../markets/instruments.ts";
import { HIP3_INSTRUMENTS } from "../markets/instruments.ts";

/** Realized tape for one HL / Trade.XYZ market. Fractions, not percents. */
export type MarketTape = {
  symbol: string;
  hl: string;
  mark: number;
  prevDayPx: number;
  dayPct: number;
  dayNtlVlm: number;
  /** Mean (high-low)/close over recent 4h bars. */
  range4h: number;
  /** Mean 4h range of the last 6 bars — a 24h session expansion. */
  range24h: number;
  /** Average notional transacted in a 4h bar. */
  vol4h: number;
  funding: number;
  source: "live" | "demo";
};

export type TapeSnapshot = {
  at: string;
  source: "live" | "demo";
  markets: Record<string, MarketTape>;
};

/** Class defaults used when a picked HL/XYZ market has no candles yet. */
export const CLASS_RANGE: Record<string, { range4h: number; range24h: number }> = {
  crypto: { range4h: 0.015, range24h: 0.022 },
  index: { range4h: 0.004, range24h: 0.006 },
  metal: { range4h: 0.009, range24h: 0.012 },
  energy: { range4h: 0.012, range24h: 0.016 },
  fx: { range4h: 0.003, range24h: 0.004 },
  equity: { range4h: 0.012, range24h: 0.018 },
};

/** Snapshot 2026-09-04 from api.hyperliquid.xyz — used when live pull fails. */
export const TAPE_FALLBACK: TapeSnapshot = {
  at: "2026-09-04T03:20:00.000Z",
  source: "demo",
  markets: indexFallback({
    BTC: t("BTC", "BTC", 80897, 77732, 0.0407, 4_508_193_922, 0.0113, 0.0176, 751_365_653, 0.0000125),
    ETH: t("ETH", "ETH", 2510.89, 2404.3, 0.0443, 1_257_939_336, 0.0142, 0.0182, 209_656_556, 0.0000125),
    SOL: t("SOL", "SOL", 103.91, 100.6, 0.0329, 321_833_702, 0.0187, 0.0209, 53_638_950, 0.0000125),
    SP500: t("SP500", "xyz:SP500", 7749, 7672.5, 0.01, 216_094_846, 0.0028, 0.0036, 36_015_808, 0),
    XYZ100: t("XYZ100", "xyz:XYZ100", 29541, 29176, 0.0125, 212_816_724, 0.0042, 0.0059, 35_469_454, 0),
    CL: t("CL", "xyz:CL", 91.79, 90.995, 0.0087, 352_329_717, 0.0115, 0.0166, 58_721_619, 0),
    SILVER: t("SILVER", "xyz:SILVER", 66.76, 65.911, 0.0129, 88_272_250, 0.0119, 0.0111, 14_712_041, 0),
    GOLD: t("GOLD", "xyz:GOLD", 4472.6, 4430, 0.0096, 74_840_333, 0.0068, 0.0061, 12_473_388, 0),
    PALLADIUM: t("PALLADIUM", "xyz:PALLADIUM", 1411.2, 1360.5, 0.0373, 1_486_569, 0.014, 0.0154, 247_761, 0),
    PLATINUM: t("PLATINUM", "xyz:PLATINUM", 1806, 1779.4, 0.015, 1_271_229, 0.0108, 0.0133, 211_871, 0),
    COPPER: t("COPPER", "xyz:COPPER", 6.671, 6.6062, 0.0098, 4_036_474, 0.0064, 0.0055, 672_745, 0),
    BRENTOIL: t("BRENTOIL", "xyz:BRENTOIL", 95.76, 95.471, 0.003, 160_588_467, 0.0105, 0.015, 26_764_744, 0),
    NATGAS: t("NATGAS", "xyz:NATGAS", 2.927, 3.0092, -0.0273, 5_969_853, 0.0129, 0.0175, 994_975, 0),
    JP225: t("JP225", "xyz:JP225", 64814, 64506, 0.0048, 1_494_837, 0.0083, 0.0092, 249_139, 0),
  }),
};

function t(
  symbol: string,
  hl: string,
  mark: number,
  prev: number,
  dayPct: number,
  vlm: number,
  range4h: number,
  range24h: number,
  vol4h: number,
  funding: number,
): MarketTape {
  return { symbol, hl, mark, prevDayPx: prev, dayPct, dayNtlVlm: vlm, range4h, range24h, vol4h, funding, source: "demo" };
}

/** Index a tape row under symbol, hl, xyz:NAME and NAME so pickers never miss. */
export function putMarket(markets: Record<string, MarketTape>, m: MarketTape): void {
  const keys = new Set<string>([m.symbol, m.hl, m.symbol.toUpperCase(), m.hl.toUpperCase()]);
  if (m.hl.includes(":")) keys.add(m.hl.slice(m.hl.indexOf(":") + 1));
  if (m.symbol && !m.symbol.includes(":")) keys.add(`xyz:${m.symbol}`);
  for (const k of keys) {
    if (k) markets[k] = m;
  }
}

function indexFallback(seed: Record<string, MarketTape>): Record<string, MarketTape> {
  const markets: Record<string, MarketTape> = {};
  for (const m of Object.values(seed)) putMarket(markets, m);
  return markets;
}

export function impliedVolAnn(range4h: number): number {
  return range4h * Math.sqrt(6 * 365);
}

export function tapeFor(symbol: string, snap: TapeSnapshot): MarketTape | undefined {
  if (!symbol) return undefined;
  const k = symbol.trim();
  if (!k) return undefined;
  const direct = snap.markets[k] ?? snap.markets[k.toUpperCase()] ?? snap.markets[`xyz:${k.toUpperCase()}`];
  if (direct) return direct;
  const upper = k.toUpperCase();
  for (const m of Object.values(snap.markets)) {
    if (m.symbol.toUpperCase() === upper || m.hl.toUpperCase() === upper) return m;
  }
  return undefined;
}

export function hip3Coins(): string[] {
  return HIP3_INSTRUMENTS.map((i) => i.hl);
}

export type { AssetClass };
