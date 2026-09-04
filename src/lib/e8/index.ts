/**
 * Public engine surface for the E8 Markets Terminal embed.
 * React is the demo. Import these functions, not the pages.
 */

export {
  evaluateConsistency,
  isoToday,
  maxTodayFromOther,
  remainingFromBest,
  type ConsistencySnapshot,
  type DayPnl,
} from "./engine/consistency.ts";
export { planCycle, defaultTargetProfit, plannedDays, type CyclePlan, type PathKind } from "./engine/plan.ts";
export { planAttack, remainingForStage, instrumentFromTape, type AttackPlan, type Persona } from "./engine/attack.ts";
export { sizeFullPort, type PortResult } from "./engine/port.ts";
export { coach, computeStats, type CoachCard, type Trade } from "./engine/analytics.ts";

export {
  ACCOUNT_SIZES,
  OFFERINGS,
  PRODUCT_META,
  SCRAPE,
  getOffering,
  guardrailsFor,
  type AccountSize,
  type ProductId,
  type Stage,
} from "./markets/catalog.ts";
export { contractLimits, sizedNotional, HIP3_MAX_NOTIONAL } from "./markets/limits.ts";
export { HIP3_INSTRUMENTS, INSTRUMENTS, getInstrument, type Instrument } from "./markets/instruments.ts";
export {
  HL_UNIVERSE,
  HL_COUNT,
  HL_NATIVE_COUNT,
  XYZ_COUNT,
  findHlAsset,
  searchHlAssets,
  inVenue,
  type HlAsset,
  type VenueFilter,
} from "./markets/hl-universe.ts";

export { tapeFor, putMarket, TAPE_FALLBACK, CLASS_RANGE, impliedVolAnn, type MarketTape, type TapeSnapshot } from "./tape/tape.ts";
export { rollupDays, parseClosedTrades, netFromGross, fmtPulledAt, type HistorySnapshot } from "./tape/history.ts";

export { useDesk, useDeskHydrated, asDayPnls } from "./state/store.ts";
export { useTape } from "./state/use-tape.ts";
export { useHistorySync, readTerminalKey, writeTerminalKey } from "./state/use-history-sync.ts";

export { fmtMoney, fmtMoneyShort, fmtPct, fmtRatio, fmtSize, clsPnL } from "./format.ts";
