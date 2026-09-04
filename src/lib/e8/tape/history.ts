/**
 * E8 Terminal Trade History → 40% day rollup.
 *
 * Trade History columns (docs/06): Symbol, Side, Volume, Entry, Exit,
 * Profit, Fee, Net PNL, Opened, Closed.
 *
 *   netPnl = profit − fee
 *
 * The 40% Best Day Rule is evaluated on **Net PNL** (generated profits
 * after fees/commissions). Gross is kept on the tape so the operator can
 * see fee drag. Session date is the UTC date of `closed` until the
 * terminal feed is wired to E8's trading-day clock.
 */

import type { Trade } from "../engine/analytics";
import type { DayRow } from "../state/types";

export type ClosedTrade = {
  id: string;
  symbol: string;
  side: "long" | "short";
  /** USD notional. Never lots. */
  notional: number;
  entry: number;
  exit: number;
  /** Gross P&L before fees/commissions (Trade History "Profit"). */
  profit: number;
  /** Fees + commissions (Trade History "Fee"). */
  fee: number;
  /** profit − fee (Trade History "Net PNL"). */
  netPnl: number;
  opened: string;
  closed: string;
};

export type HistorySnapshot = {
  source: "terminal" | "demo";
  accountLabel: string;
  pulledAt: string;
  trades: ClosedTrade[];
  days: DayRow[];
  tape: Trade[];
  cycleNet: number;
  cycleGross: number;
  cycleFees: number;
  equity?: number;
  startingBalance?: number;
  live?: {
    symbol: string;
    side: "long" | "short";
    openPnl: number;
    notional: number;
    entry: number;
    mark: number;
  } | null;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function netFromGross(profit: number, fee: number): number {
  return round2(profit - fee);
}

export function sessionDate(closedIso: string): string {
  const d = new Date(closedIso);
  if (Number.isNaN(d.getTime())) return closedIso.slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function normalizeClosed(raw: Partial<ClosedTrade> & { id: string; symbol: string }): ClosedTrade {
  const profit = Number(raw.profit ?? 0);
  const fee = Number(raw.fee ?? 0);
  const net = raw.netPnl != null ? Number(raw.netPnl) : netFromGross(profit, fee);
  const side = raw.side === "short" ? "short" : "long";
  return {
    id: raw.id,
    symbol: raw.symbol,
    side,
    notional: Number(raw.notional ?? 0),
    entry: Number(raw.entry ?? 0),
    exit: Number(raw.exit ?? 0),
    profit: round2(profit),
    fee: round2(fee),
    netPnl: round2(net),
    opened: raw.opened ?? raw.closed ?? new Date().toISOString(),
    closed: raw.closed ?? raw.opened ?? new Date().toISOString(),
  };
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["orders", "trades", "fills", "data", "items", "result"]) {
      if (Array.isArray(o[k])) return asList(o[k]);
    }
  }
  return [];
}

export function unwrapMcp(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const o = payload as Record<string, unknown>;
  if (o.result != null) return unwrapMcp(o.result);
  if (Array.isArray(o.content)) {
    const texts = o.content
      .map((c) => (c && typeof c === "object" ? (c as { text?: string }).text : null))
      .filter((t): t is string => !!t);
    if (texts.length === 1) {
      try {
        return JSON.parse(texts[0]);
      } catch {
        return texts[0];
      }
    }
  }
  return payload;
}

function parseSide(v: unknown): "long" | "short" {
  const s = String(v ?? "").toLowerCase();
  if (s === "sell" || s === "short" || s === "s") return "short";
  return "long";
}

function isClosedStatus(v: unknown): boolean {
  const s = String(v ?? "").toUpperCase();
  if (!s) return true;
  return ["FILLED", "SETTLED", "CLOSED", "COMPLETE", "COMPLETED"].includes(s);
}

/** Map MCP / Trade History payloads into ClosedTrade rows. */
export function parseClosedTrades(raw: unknown): ClosedTrade[] {
  const rows = asList(unwrapMcp(raw));
  const out: ClosedTrade[] = [];
  for (const r of rows) {
    if (r.status != null && !isClosedStatus(r.status)) continue;
    const symbol = str(r.symbol) ?? str(r.asset) ?? str(r.ticker);
    if (!symbol) continue;
    const profit = num(r.profit ?? r.pnl ?? r.realizedPnl ?? r.realized_pnl ?? r.grossPnl ?? r.gross_pnl);
    const fee = num(r.fee ?? r.fees ?? r.commission ?? r.commissions);
    const netPnl =
      r.netPnl != null || r.net_pnl != null || r.netPNL != null
        ? num(r.netPnl ?? r.net_pnl ?? r.netPNL)
        : undefined;
    const closed = str(r.closed) ?? str(r.closedAt) ?? str(r.closed_at) ?? str(r.updatedAt) ?? str(r.filledAt);
    const opened = str(r.opened) ?? str(r.openedAt) ?? str(r.opened_at) ?? str(r.createdAt) ?? closed;
    if (!closed && r.status == null) continue;
    out.push(
      normalizeClosed({
        id: str(r.id) ?? str(r.orderId) ?? str(r.tradeId) ?? `th_${symbol}_${out.length}`,
        symbol,
        side: parseSide(r.side ?? r.direction),
        notional: (() => {
          const explicit = num(r.notional ?? r.notionalUsd ?? r.usd, NaN);
          if (Number.isFinite(explicit) && explicit > 0) return explicit;
          const qty = num(r.volume ?? r.size ?? r.qty ?? r.quantity);
          const px = num(r.entry ?? r.avgEntry ?? r.avg_entry ?? r.openPrice ?? r.price);
          return round2(qty * px);
        })(),
        entry: num(r.entry ?? r.avgEntry ?? r.avg_entry ?? r.openPrice ?? r.price),
        exit: num(r.exit ?? r.avgExit ?? r.avg_exit ?? r.closePrice ?? r.avgFill ?? r.avg_fill),
        profit,
        fee,
        netPnl,
        opened: opened ?? new Date().toISOString(),
        closed: closed ?? opened ?? new Date().toISOString(),
      }),
    );
  }
  return out;
}

export function rollupDays(trades: ClosedTrade[]): DayRow[] {
  const byDate = new Map<
    string,
    { gross: number; fees: number; net: number; count: number; symbols: string[] }
  >();
  for (const t of trades) {
    const date = sessionDate(t.closed);
    const row = byDate.get(date) ?? { gross: 0, fees: 0, net: 0, count: 0, symbols: [] };
    row.gross += t.profit;
    row.fees += t.fee;
    row.net += t.netPnl;
    row.count += 1;
    if (!row.symbols.includes(t.symbol)) row.symbols.push(t.symbol);
    byDate.set(date, row);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      id: `day_${date}`,
      date,
      closedPnl: round2(row.net),
      grossPnl: round2(row.gross),
      fees: round2(row.fees),
      tradeCount: row.count,
      notes: `${row.count} fill${row.count === 1 ? "" : "s"} · ${row.symbols.join(" · ")}`,
      source: "terminal" as const,
    }));
}

export function toTape(trades: ClosedTrade[]): Trade[] {
  return trades.map((t) => ({
    id: t.id,
    date: sessionDate(t.closed),
    symbol: t.symbol,
    side: t.side,
    pnl: t.netPnl,
    grossPnl: t.profit,
    fees: t.fee,
    booked: true,
    notional: t.notional,
    entry: t.entry,
    exit: t.exit,
    openedAt: t.opened,
    closedAt: t.closed,
  }));
}

export function snapshotFromTrades(
  trades: ClosedTrade[],
  meta: { source: HistorySnapshot["source"]; accountLabel: string; equity?: number; startingBalance?: number },
): HistorySnapshot {
  const days = rollupDays(trades);
  const cycleNet = round2(days.reduce((a, d) => a + d.closedPnl, 0));
  const cycleGross = round2(days.reduce((a, d) => a + d.grossPnl, 0));
  const cycleFees = round2(days.reduce((a, d) => a + d.fees, 0));
  return {
    source: meta.source,
    accountLabel: meta.accountLabel,
    pulledAt: new Date().toISOString(),
    trades,
    days,
    tape: toTape(trades),
    cycleNet,
    cycleGross,
    cycleFees,
    equity: meta.equity,
    startingBalance: meta.startingBalance,
  };
}

function utcDaysAgo(n: number, hour = 16, minute = 12): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 4, 0);
  return d.toISOString();
}

/**
 * Replay of the 2026-09-04 E8 Chief HL $500K session's prior closed tape,
 * scaled to the selected book. Live SP500 $1.24M notional is still open — not here.
 */
export function demoClosedTrades(size = 500_000): ClosedTrade[] {
  const k = size / 500_000;
  const scale = (n: number) => round2(n * k);
  return [
    normalizeClosed({
      id: "th_eth_1",
      symbol: "ETH",
      side: "long",
      notional: scale(40 * 4280),
      entry: 4280,
      exit: 4337.75,
      profit: scale(2310),
      fee: scale(70),
      opened: utcDaysAgo(3, 13, 4),
      closed: utcDaysAgo(3, 15, 41),
    }),
    normalizeClosed({
      id: "th_sol_1",
      symbol: "SOL",
      side: "short",
      notional: scale(800 * 188.4),
      entry: 188.4,
      exit: 185.975,
      profit: scale(1940),
      fee: scale(130),
      opened: utcDaysAgo(2, 12, 10),
      closed: utcDaysAgo(2, 14, 22),
    }),
    normalizeClosed({
      id: "th_hype_1",
      symbol: "HYPE",
      side: "long",
      notional: scale(200 * 42.1),
      entry: 42.1,
      exit: 50.2,
      profit: scale(1620),
      fee: scale(55),
      opened: utcDaysAgo(1, 11, 2),
      closed: utcDaysAgo(1, 13, 18),
    }),
    normalizeClosed({
      id: "th_cl_1",
      symbol: "CL",
      side: "short",
      notional: scale(12 * 72.4),
      entry: 72.4,
      exit: 71.525,
      profit: scale(1050),
      fee: scale(55),
      opened: utcDaysAgo(1, 14, 40),
      closed: utcDaysAgo(1, 16, 5),
    }),
    normalizeClosed({
      id: "th_btc_1",
      symbol: "BTCUSD",
      side: "long",
      notional: scale(0.8 * 110_100),
      entry: 110_100,
      exit: 111_325,
      profit: scale(980),
      fee: scale(60),
      opened: utcDaysAgo(0, 7, 12),
      closed: utcDaysAgo(0, 8, 3),
    }),
  ];
}

export function demoHistory(size = 500_000): HistorySnapshot {
  const trades = demoClosedTrades(size);
  const snap = snapshotFromTrades(trades, {
    source: "demo",
    accountLabel: `E8 One $${Math.round(size / 1000)}K · Perpetual · Trade History`,
    startingBalance: size,
  });
  snap.equity = round2(size + snap.cycleNet);
  if (size === 500_000) {
    snap.live = {
      symbol: "SP500",
      side: "long",
      openPnl: 12_410,
      notional: 1_239_328,
      entry: 7747.07,
      mark: 7824.63,
    };
    snap.equity = round2(size + snap.cycleNet + 12_410);
  }
  return snap;
}

export function fmtPulledAt(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "never";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
