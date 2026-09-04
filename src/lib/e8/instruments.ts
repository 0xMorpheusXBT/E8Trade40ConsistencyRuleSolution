/**
 * Terminal instruments the planner can size against.
 *
 * Official E8 One FX book (help 11775980): Forex 1:30, Indices 1:15,
 * Metals 1:15, Crypto 1:1.
 *
 * Hyperliquid HIP-3 perps on the E8 terminal (observed 2026-09-04 on an
 * E8 Chief HL — Unlimited $500,000 netting book) run 15x. BTCUSD CEX on
 * that same session was symbol-restricted; the desk rotated into SP500
 * HIP-3 at 15x. The user-facing "15x BTC" example is this HIP-3 book,
 * not the 1:1 CEX crypto product.
 *
 * Marks are illustrative — the planner uses them to convert a % stop into
 * dollars of price. Wire live marks from e8_trade_asset_get when embedding.
 */

export type AssetClass = "crypto" | "index" | "fx" | "metal" | "energy";

export type Instrument = {
  id: string;
  symbol: string;
  label: string;
  venue: string;
  assetClass: AssetClass;
  leverage: number;
  mark: number;
  note: string;
};

export const INSTRUMENTS: Instrument[] = [
  {
    id: "btc-hl-15x",
    symbol: "BTC",
    label: "BTC · HIP-3",
    venue: "Hyperliquid",
    assetClass: "crypto",
    leverage: 15,
    mark: 110_250,
    note: "15x HIP-3 perpetual. This is the 15x BTC example — not CEX crypto 1:1.",
  },
  {
    id: "eth-hl-15x",
    symbol: "ETH",
    label: "ETH · HIP-3",
    venue: "Hyperliquid",
    assetClass: "crypto",
    leverage: 15,
    mark: 4_280,
    note: "15x HIP-3 perpetual.",
  },
  {
    id: "sp500-hl-15x",
    symbol: "SP500",
    label: "SP500 · HIP-3",
    venue: "Hyperliquid",
    assetClass: "index",
    leverage: 15,
    mark: 7_747.07,
    note: "Observed 2026-09-04: Buy 160 @ 7,747.07, ~$1.24M notional on the $500K book.",
  },
  {
    id: "btcusd-cex",
    symbol: "BTCUSD",
    label: "BTCUSD · CEX",
    venue: "CEX",
    assetClass: "crypto",
    leverage: 1,
    mark: 110_250,
    note: "Official E8 One Crypto leverage is 1:1. Symbol was restricted on the 2026-09-04 HL book.",
  },
  {
    id: "xauusd",
    symbol: "XAUUSD",
    label: "Gold",
    venue: "CFD",
    assetClass: "metal",
    leverage: 15,
    mark: 3_540,
    note: "Official E8 One metals leverage 1:15.",
  },
  {
    id: "eurusd",
    symbol: "EURUSD",
    label: "EURUSD",
    venue: "FX",
    assetClass: "fx",
    leverage: 30,
    mark: 1.0842,
    note: "Official E8 One forex leverage 1:30.",
  },
];

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}
