/**
 * HIP-3 instruments the planner sizes against.
 *
 * Contract: src/lib/e8/markets/limits.ts (Markets screenshots 2026-09-04).
 * BTC/ETH/SOL 15x. Indices/energy/precious 15x $1.3M. Copper 8x $1.3M.
 */

import { contractLimits, HIP3_MAX_NOTIONAL } from "./limits.ts";

export type AssetClass = "crypto" | "index" | "fx" | "metal" | "energy";
export type InstrumentBook = "hip-3" | "hl-perp";

export type Instrument = {
  id: string;
  symbol: string;
  hl: string;
  label: string;
  venue: string;
  book: InstrumentBook;
  assetClass: AssetClass;
  leverage: number;
  maxNotional: number;
  mark: number;
  note: string;
};

function hip3(
  symbol: string,
  assetClass: AssetClass,
  mark: number,
  opts?: { venue?: string; hl?: string; note?: string; book?: InstrumentBook },
): Instrument {
  const venue = opts?.venue ?? "Trade.XYZ";
  const book: InstrumentBook = opts?.book ?? (venue === "Hyperliquid" ? "hl-perp" : "hip-3");
  const hl = opts?.hl ?? (venue === "Hyperliquid" ? symbol : `xyz:${symbol}`);
  const c = contractLimits({ symbol, assetClass, book: book === "hl-perp" ? "hl-perp" : "hip3-xyz", dex: book === "hip-3" ? "xyz" : "native" });
  const cap = Number.isFinite(c.maxNotional) ? ` · max ${c.maxNotional === HIP3_MAX_NOTIONAL ? "$1.30M" : c.maxNotional} notional` : "";
  return {
    id: `${symbol.toLowerCase()}-hl-${c.maxLeverage}x`,
    symbol,
    hl,
    label: `${symbol} · HIP-3`,
    venue,
    book,
    assetClass,
    leverage: c.maxLeverage,
    maxNotional: c.maxNotional,
    mark,
    note:
      opts?.note ??
      `${c.maxLeverage}x HIP-3 perpetual on ${venue}${cap}. Sized in USD notional — not lots.`,
  };
}

export const INSTRUMENTS: Instrument[] = [
  hip3("BTC", "crypto", 80_897, {
    venue: "Hyperliquid",
    book: "hl-perp",
    note: "15x BTC on Hyperliquid. This is the 15x BTC example — not CEX crypto 1:1.",
  }),
  hip3("SOL", "crypto", 103.91, { venue: "Hyperliquid", book: "hl-perp" }),
  hip3("ETH", "crypto", 2_510.89, { venue: "Hyperliquid", book: "hl-perp" }),
  hip3("SP500", "index", 7_749, {
    note: "15x · $1.30M max notional. Observed 2026-09-04 on the $500K book.",
  }),
  hip3("XYZ100", "index", 29_541),
  hip3("CL", "energy", 91.79),
  hip3("SILVER", "metal", 66.76),
  hip3("GOLD", "metal", 4_472.6),
  hip3("PALLADIUM", "metal", 1_411),
  hip3("PLATINUM", "metal", 1_806),
  hip3("COPPER", "metal", 6.671, {
    note: "8x HIP-3 · $1.30M max notional — the only metal on this desk below 15x.",
  }),
  hip3("BRENTOIL", "energy", 95.76),
  hip3("NATGAS", "energy", 2.927),
  hip3("JP225", "index", 64_814),
];

export const HIP3_INSTRUMENTS = INSTRUMENTS;

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}

export function getInstrumentBySymbol(symbol: string): Instrument | undefined {
  const k = symbol.trim().toUpperCase();
  return INSTRUMENTS.find((i) => i.symbol.toUpperCase() === k || i.hl.toUpperCase() === k);
}
