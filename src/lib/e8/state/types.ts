import type { AccountSize, ProductId, Stage } from "../markets/catalog";

export type LiveTrade = {
  symbol: string;
  side: "long" | "short";
  openPnl: number;
  /** Position size in USD notional. Never lots. */
  notional: number;
  entry: number;
  mark: number;
};

export type DayRow = {
  id: string;
  date: string;
  /** Net PNL after fees — this is what the 40% rule sees. */
  closedPnl: number;
  grossPnl: number;
  fees: number;
  tradeCount: number;
  notes?: string;
  source?: "terminal" | "manual";
};

export type DeskSnapshotMeta = {
  product: ProductId;
  size: AccountSize;
  stage: Stage;
};
