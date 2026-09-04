import type { Trade } from "./analytics";
import type { DayRow, LiveTrade } from "./types";
import { demoClosedTrades, toTape } from "./history";
import { rollupDays } from "./history";

/**
 * Seeded off the 2026-09-04 terminal session on an E8 Chief HL $500K
 * netting book after a 160-lot SP500 HIP-3 fill. Days are the Trade
 * History rollup (Net PNL = Profit − Fee).
 */
export const SAMPLE_DAYS: DayRow[] = rollupDays(demoClosedTrades(500_000));
export const SAMPLE_TRADES: Trade[] = toTape(demoClosedTrades(500_000));

export const SAMPLE_LIVE: LiveTrade = {
  symbol: "SP500",
  side: "long",
  openPnl: 12_410,
  notional: 1_239_328,
  entry: 7747.07,
  mark: 7824.63,
};
