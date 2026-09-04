/**
 * Terminal instruments the planner can size against.
 *
 * Official E8 One FX book (help 11775980): Forex 1:30, Indices 1:15,
 * Metals 1:15, Crypto 1:1.
 *
 * Hyperliquid HIP-3 / Trade.XYZ perps on the E8 terminal (observed 2026-09-04
 * on an E8 Chief HL — Unlimited $500,000 netting book) run 15x, except
 * Copper at 8x. BTCUSD CEX on that same session was symbol-restricted; the
 * desk rotated into SP500 HIP-3 at 15x. The user-facing "15x BTC" example
 * is this HIP-3 book, not the 1:1 CEX crypto product.
 *
 * Marks refresh from Hyperliquid when the tape is live.
 */

export type AssetClass = "crypto" | "index" | "fx" | "metal" | "energy";
export type InstrumentBook = "hip-3" | "cex" | "fx";

export type Instrument = {
  id: string;
  symbol: string;
  hl: string;
  label: string;
  venue: string;
  book: InstrumentBook;
  assetClass: AssetClass;
  leverage: number;
  mark: number;
  note: string;
};

function hip3(
  symbol: string,
  assetClass: AssetClass,
  mark: number,
  opts?: { leverage?: number; venue?: string; hl?: string; note?: string },
): Instrument {
  const lev = opts?.leverage ?? 15;
  const venue = opts?.venue ?? "Trade.XYZ";
  const hl = opts?.hl ?? (venue === "Hyperliquid" ? symbol : `xyz:${symbol}`);
  return {
    id: `${symbol.toLowerCase()}-hl-${lev}x`,
    symbol,
    hl,
    label: `${symbol} · HIP-3`,
    venue,
    book: "hip-3",
    assetClass,
    leverage: lev,
    mark,
    note:
      opts?.note ??
      `${lev}x HIP-3 perpetual on ${venue}. Sized in USD notional — not lots.`,
  };
}

export const INSTRUMENTS: Instrument[] = [
  hip3("BTC", "crypto", 80_897, {
    venue: "Hyperliquid",
    note: "15x HIP-3 perpetual. This is the 15x BTC example — not CEX crypto 1:1.",
  }),
  hip3("SOL", "crypto", 103.91, { venue: "Hyperliquid" }),
  hip3("ETH", "crypto", 2_510.89, { venue: "Hyperliquid" }),
  hip3("SP500", "index", 7_749, {
    note: "Observed 2026-09-04: SP500 HIP-3, ~$1.24M notional on the $500K book.",
  }),
  hip3("XYZ100", "index", 29_541),
  hip3("CL", "energy", 91.79),
  hip3("SILVER", "metal", 66.76),
  hip3("GOLD", "metal", 4_472.6),
  hip3("PALLADIUM", "metal", 1_411),
  hip3("PLATINUM", "metal", 1_806),
  hip3("COPPER", "metal", 6.671, {
    leverage: 8,
    note: "8x HIP-3 perpetual on Trade.XYZ — the only metal on this desk below 15x.",
  }),
  hip3("BRENTOIL", "energy", 95.76),
  hip3("NATGAS", "energy", 2.927),
  hip3("JP225", "index", 64_814),
  {
    id: "btcusd-cex",
    symbol: "BTCUSD",
    hl: "BTC",
    label: "BTCUSD · CEX",
    venue: "CEX",
    book: "cex",
    assetClass: "crypto",
    leverage: 1,
    mark: 80_897,
    note: "Official E8 One Crypto leverage is 1:1. Symbol was restricted on the 2026-09-04 HL book.",
  },
  {
    id: "eurusd",
    symbol: "EURUSD",
    hl: "xyz:EURUSD",
    label: "EURUSD",
    venue: "FX",
    book: "fx",
    assetClass: "fx",
    leverage: 30,
    mark: 1.0842,
    note: "Official E8 One forex leverage 1:30. Not a HIP-3 market.",
  },
];

export const HIP3_INSTRUMENTS = INSTRUMENTS.filter((i) => i.book === "hip-3");
export const OTHER_INSTRUMENTS = INSTRUMENTS.filter((i) => i.book !== "hip-3");

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}

export function getInstrumentBySymbol(symbol: string): Instrument | undefined {
  const k = symbol.trim().toUpperCase();
  return INSTRUMENTS.find((i) => i.symbol.toUpperCase() === k || i.hl.toUpperCase() === k);
}
