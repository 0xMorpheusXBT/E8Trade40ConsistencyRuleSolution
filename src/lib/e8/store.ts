import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import { ACCOUNT_SIZES, getOffering, guardrailsFor, type AccountSize, type ProductId, type Stage } from "./catalog";
import { isoToday, type DayPnl } from "./consistency";
import type { Trade } from "./analytics";
import type { DayRow, LiveTrade } from "./types";
import type { HistorySnapshot } from "./history";
import { SAMPLE_DAYS, SAMPLE_LIVE, SAMPLE_TRADES } from "./seed";
import { defaultTargetProfit } from "./plan";
import { INSTRUMENTS } from "./instruments";

export type { LiveTrade, DayRow };

export type DeskState = {
  product: ProductId;
  size: AccountSize;
  stage: Stage;
  consistencyPct: number;
  startingBalance: number;
  currentEquity: number;
  leftoverBuffer: number;
  days: DayRow[];
  trades: Trade[];
  live: LiveTrade | null;
  targetProfit: number;
  winRatePct: number;
  rewardRisk: number;
  tradesPerDay: number;
  instrumentId: string;
  leverageOverride: number | null;
  markOverride: number | null;
  historySource: "terminal" | "demo" | null;
  lastSyncedAt: string | null;
  historyAccount: string | null;
  historyDirty: boolean;
};

export type DeskActions = {
  setProduct: (product: ProductId) => void;
  setSize: (size: AccountSize) => void;
  setStage: (stage: Stage) => void;
  setConsistencyPct: (pct: number) => void;
  setEquity: (n: number) => void;
  setStartingBalance: (n: number) => void;
  setLeftoverBuffer: (n: number) => void;
  setTargetProfit: (n: number) => void;
  setWinRatePct: (n: number) => void;
  setRewardRisk: (n: number) => void;
  setTradesPerDay: (n: number) => void;
  setInstrumentId: (id: string) => void;
  setLeverageOverride: (n: number | null) => void;
  setMarkOverride: (n: number | null) => void;
  addDay: (date: string, closedPnl: number, notes?: string) => void;
  updateDay: (id: string, patch: Partial<{ date: string; closedPnl: number; notes: string }>) => void;
  removeDay: (id: string) => void;
  addTrade: (t: Omit<Trade, "id">) => void;
  removeTrade: (id: string) => void;
  bookResult: (pnl: number, opts?: { symbol?: string; risk?: number; date?: string; notes?: string }) => void;
  setLive: (live: LiveTrade | null) => void;
  patchLive: (patch: Partial<LiveTrade>) => void;
  bookLive: () => void;
  loadSample: () => void;
  resetCycle: () => void;
  newFundedBook: () => void;
  applyHistory: (snap: HistorySnapshot) => void;
};

function freshFor(size: AccountSize, product: ProductId): Pick<
  DeskState,
  | "size"
  | "product"
  | "startingBalance"
  | "currentEquity"
  | "leftoverBuffer"
  | "targetProfit"
  | "days"
  | "trades"
  | "live"
> {
  const offering = getOffering(product, size);
  const g = guardrailsFor(offering, size);
  return {
    size,
    product,
    startingBalance: size,
    currentEquity: size,
    leftoverBuffer: 0,
    targetProfit: defaultTargetProfit(size, g.minPayout),
    days: [],
    trades: [],
    live: null,
  };
}

const initial: DeskState = {
  ...freshFor(100_000, "e8-one"),
  stage: "performance",
  consistencyPct: 40,
  winRatePct: 55,
  rewardRisk: 2,
  tradesPerDay: 2,
  instrumentId: INSTRUMENTS[0].id,
  leverageOverride: null,
  markOverride: null,
  historySource: null,
  lastSyncedAt: null,
  historyAccount: null,
  historyDirty: false,
};

export const useDesk = create<DeskState & DeskActions>()(
  persist(
    (set, get) => ({
      ...initial,
      setProduct: (product) => {
        const size = get().size;
        const offering = getOffering(product, size);
        const g = guardrailsFor(offering, get().currentEquity || size);
        set({
          product,
          consistencyPct: offering.officialConsistencyPct ?? 40,
          targetProfit: defaultTargetProfit(size, g.minPayout),
        });
      },
      setSize: (size) => {
        if (!ACCOUNT_SIZES.includes(size)) return;
        const product = get().product;
        const offering = getOffering(product, size);
        const g = guardrailsFor(offering, size);
        set({
          ...freshFor(size, product),
          stage: get().stage,
          consistencyPct: get().consistencyPct,
          winRatePct: get().winRatePct,
          rewardRisk: get().rewardRisk,
          tradesPerDay: get().tradesPerDay,
          instrumentId: get().instrumentId,
          leverageOverride: get().leverageOverride,
          markOverride: get().markOverride,
          targetProfit: defaultTargetProfit(size, g.minPayout),
        });
      },
      setStage: (stage) => set({ stage }),
      setConsistencyPct: (pct) => set({ consistencyPct: Math.min(60, Math.max(20, pct)) }),
      setEquity: (n) => set({ currentEquity: n }),
      setStartingBalance: (n) => set({ startingBalance: n }),
      setLeftoverBuffer: (n) => set({ leftoverBuffer: n }),
      setTargetProfit: (n) => set({ targetProfit: Math.max(0, n) }),
      setWinRatePct: (n) => set({ winRatePct: Math.min(90, Math.max(10, n)) }),
      setRewardRisk: (n) => set({ rewardRisk: Math.min(5, Math.max(0.5, n)) }),
      setTradesPerDay: (n) => set({ tradesPerDay: Math.min(8, Math.max(1, Math.round(n))) }),
      setInstrumentId: (id) => set({ instrumentId: id, leverageOverride: null, markOverride: null }),
      setLeverageOverride: (n) => set({ leverageOverride: n }),
      setMarkOverride: (n) => set({ markOverride: n }),
      addDay: (date, closedPnl, notes) =>
        set({
          days: [
            ...get().days,
            {
              id: uid("day"),
              date,
              closedPnl,
              grossPnl: closedPnl,
              fees: 0,
              tradeCount: 1,
              notes,
              source: "manual" as const,
            },
          ].sort((a, b) => a.date.localeCompare(b.date)),
          historyDirty: true,
        }),
      updateDay: (id, patch) =>
        set({
          days: get().days.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }),
      removeDay: (id) => set({ days: get().days.filter((d) => d.id !== id) }),
      addTrade: (t) => set({ trades: [...get().trades, { ...t, id: uid("tr") }] }),
      removeTrade: (id) => set({ trades: get().trades.filter((t) => t.id !== id) }),
      bookResult: (pnl, opts) => {
        const today = opts?.date ?? isoToday();
        const { days, trades, currentEquity } = get();
        const existing = days.find((d) => d.date === today);
        const notes = opts?.notes ?? (pnl >= 0 ? "Booked winner" : "Booked loss");
        const nextDays = existing
          ? days.map((d) =>
              d.id === existing.id
                ? {
                    ...d,
                    closedPnl: d.closedPnl + pnl,
                    grossPnl: (d.grossPnl ?? d.closedPnl) + pnl,
                    tradeCount: (d.tradeCount ?? 1) + 1,
                    notes: d.notes ?? notes,
                  }
                : d,
            )
          : [
              ...days,
              {
                id: uid("day"),
                date: today,
                closedPnl: pnl,
                grossPnl: pnl,
                fees: 0,
                tradeCount: 1,
                notes,
                source: "manual" as const,
              },
            ];
        const nextTrades = [
          ...trades,
          {
            id: uid("tr"),
            date: today,
            symbol: opts?.symbol ?? "MANUAL",
            side: (pnl >= 0 ? "long" : "short") as "long" | "short",
            pnl,
            fees: 0,
            risk: opts?.risk,
            booked: true,
          },
        ];
        set({
          days: nextDays,
          trades: nextTrades,
          currentEquity: Math.round((currentEquity + pnl) * 100) / 100,
          historyDirty: true,
        });
      },
      setLive: (live) => set({ live }),
      patchLive: (patch) => {
        const live = get().live;
        if (!live) return;
        const next = { ...live, ...patch };
        if (patch.mark != null && live.entry) {
          const dir = live.side === "long" ? 1 : -1;
          const notion = next.notional || live.notional;
          next.openPnl = Math.round(dir * notion * ((patch.mark - live.entry) / live.entry) * 100) / 100;
        }
        set({ live: next });
      },
      bookLive: () => {
        const { live, days, trades, currentEquity } = get();
        if (!live) return;
        const today = isoToday();
        const existing = days.find((d) => d.date === today);
        const feesNote = `Booked ${live.side} ${live.symbol} net of fees`;
        const nextDays = existing
          ? days.map((d) =>
              d.id === existing.id
                ? {
                    ...d,
                    closedPnl: d.closedPnl + live.openPnl,
                    grossPnl: (d.grossPnl ?? d.closedPnl) + live.openPnl,
                    tradeCount: (d.tradeCount ?? 1) + 1,
                    notes: d.notes ?? feesNote,
                  }
                : d,
            )
          : [
              ...days,
              {
                id: uid("day"),
                date: today,
                closedPnl: live.openPnl,
                grossPnl: live.openPnl,
                fees: 0,
                tradeCount: 1,
                notes: feesNote,
                source: "manual" as const,
              },
            ];
        const nextTrades = [
          ...trades,
          {
            id: uid("tr"),
            date: today,
            symbol: live.symbol,
            side: live.side,
            pnl: live.openPnl,
            fees: 0,
            booked: true,
          },
        ];
        set({
          days: nextDays,
          trades: nextTrades,
          live: null,
          currentEquity: Math.round((currentEquity + live.openPnl) * 100) / 100,
          historyDirty: true,
        });
      },
      loadSample: () =>
        set({
          product: "e8-one",
          size: 500_000,
          stage: "performance",
          consistencyPct: 40,
          startingBalance: 500_000,
          currentEquity: 562_403.24,
          leftoverBuffer: 45_000,
          targetProfit: 40_000,
          days: SAMPLE_DAYS.map((d) => ({ ...d, id: uid("day") })),
          trades: SAMPLE_TRADES.map((t) => ({ ...t, id: uid("tr") })),
          live: { ...SAMPLE_LIVE },
          instrumentId: "sp500-hl-15x",
          leverageOverride: 15,
          markOverride: 7824.63,
          historySource: "demo",
          lastSyncedAt: new Date().toISOString(),
          historyAccount: "E8 One $500K · Perpetual · Trade History",
          historyDirty: false,
        }),
      resetCycle: () =>
        set({
          leftoverBuffer: Math.max(0, get().currentEquity - get().size),
          days: [],
          trades: [],
          live: null,
          historySource: null,
          lastSyncedAt: null,
          historyAccount: null,
          historyDirty: false,
        }),
      newFundedBook: () => {
        const { size, product, stage, consistencyPct, winRatePct, rewardRisk, tradesPerDay, instrumentId } = get();
        set({
          ...freshFor(size, product),
          stage,
          consistencyPct,
          winRatePct,
          rewardRisk,
          tradesPerDay,
          instrumentId,
          leverageOverride: null,
          markOverride: null,
          historySource: null,
          lastSyncedAt: null,
          historyAccount: null,
          historyDirty: false,
        });
      },
      applyHistory: (snap) => {
        const { leftoverBuffer, startingBalance, live } = get();
        const cycleNet = snap.cycleNet;
        const stale = live && live.notional === 0 && live.openPnl === 0 && live.entry === 0;
        const nextLive = snap.live ?? (stale ? null : live);
        const open = nextLive?.openPnl ?? 0;
        const start = snap.startingBalance ?? startingBalance;
        set({
          days: snap.days,
          trades: snap.tape,
          historySource: snap.source,
          lastSyncedAt: snap.pulledAt,
          historyAccount: snap.accountLabel,
          startingBalance: start,
          currentEquity: snap.equity ?? Math.round((start + leftoverBuffer + cycleNet + open) * 100) / 100,
          live: nextLive,
          historyDirty: false,
        });
      },
    }),
    { name: "e8-consistency-rule-v5" },
  ),
);

export function useDeskHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useDesk.persist.hasHydrated()) finish();
    const unsub = useDesk.persist.onFinishHydration(finish);
    return unsub;
  }, []);
  return hydrated;
}

export function asDayPnls(days: DeskState["days"]): DayPnl[] {
  return days.map((d) => ({ date: d.date, closedPnl: d.closedPnl }));
}
