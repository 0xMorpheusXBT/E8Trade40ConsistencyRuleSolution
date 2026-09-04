import { findHlAsset } from "../markets/hl-universe.ts";
import { HIP3_INSTRUMENTS } from "../markets/instruments.ts";
import {
  CLASS_RANGE,
  TAPE_FALLBACK,
  putMarket,
  type MarketTape,
  type TapeSnapshot,
} from "./tape.ts";

const HL = "https://api.hyperliquid.xyz/info";

type HlCandle = { t: number; o: string; h: string; l: string; c: string; v: string };
type HlCtx = {
  markPx?: string;
  prevDayPx?: string;
  dayNtlVlm?: string;
  funding?: string;
};
type HlMeta = { universe: { name: string; isDelisted?: boolean }[] };

async function post(body: unknown): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(HL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`hl ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

type CtxRow = { mark: number; prev: number; vlm: number; funding: number };

/** Native book + xyz HIP-3. Keys are universe names (`BTC`, `xyz:SP500`). */
async function ctxMaps(): Promise<Map<string, CtxRow>> {
  const out = new Map<string, CtxRow>();
  const packs: { dex?: string }[] = [{}, { dex: "xyz" }];
  await Promise.all(
    packs.map(async (p) => {
      try {
        const body = p.dex ? { type: "metaAndAssetCtxs", dex: p.dex } : { type: "metaAndAssetCtxs" };
        const raw = (await post(body)) as [HlMeta, HlCtx[]];
        if (!Array.isArray(raw) || raw.length < 2) return;
        const [meta, ctxs] = raw;
        const uni = meta?.universe ?? [];
        for (let i = 0; i < uni.length; i++) {
          const u = uni[i];
          if (!u?.name) continue;
          const c = ctxs[i] ?? {};
          const row: CtxRow = {
            mark: num(c.markPx),
            prev: num(c.prevDayPx),
            vlm: num(c.dayNtlVlm),
            funding: num(c.funding),
          };
          out.set(u.name, row);
          if (u.name.includes(":")) out.set(u.name.slice(u.name.indexOf(":") + 1), row);
          else if (p.dex) out.set(`${p.dex}:${u.name}`, row);
        }
      } catch {
        /* one venue failing must not blank the other */
      }
    }),
  );
  return out;
}

async function candles4h(coin: string): Promise<{ range4h: number; range24h: number; vol4h: number; last: number }> {
  const now = Date.now();
  const raw = (await post({
    type: "candleSnapshot",
    req: { coin, interval: "4h", startTime: now - 8 * 24 * 3600 * 1000, endTime: now },
  })) as HlCandle[];
  const bars = Array.isArray(raw) ? raw : [];
  const ranges: number[] = [];
  const vols: number[] = [];
  for (const b of bars) {
    const cl = num(b.c);
    const h = num(b.h);
    const l = num(b.l);
    if (cl > 0) ranges.push((h - l) / cl);
    vols.push(num(b.v) * cl);
  }
  const last6 = ranges.slice(-6);
  return {
    range4h: mean(ranges.slice(-42)),
    range24h: mean(last6.length ? last6 : ranges),
    vol4h: mean(vols.slice(-42)),
    last: bars.length ? num(bars[bars.length - 1].c) : 0,
  };
}

function rowToTape(key: string, row: CtxRow): MarketTape | null {
  const asset = findHlAsset(key);
  if (!asset) return null;
  if (!row.mark) return null;
  const ranges = CLASS_RANGE[asset.assetClass] ?? CLASS_RANGE.crypto;
  const prev = row.prev || row.mark;
  return {
    symbol: asset.symbol,
    hl: asset.hl,
    mark: row.mark,
    prevDayPx: prev,
    dayPct: prev ? (row.mark - prev) / prev : 0,
    dayNtlVlm: row.vlm,
    range4h: ranges.range4h,
    range24h: ranges.range24h,
    vol4h: row.vlm / 6,
    funding: row.funding,
    source: "live",
  };
}

/**
 * Full E8 book tape: every HL_PERP + every HL_HIP3_XYZ mark/prev/volume/funding
 * from metaAndAssetCtxs, plus 4h candles for HIP-3 + any extra coins the desk asked for.
 */
export async function pullMarketTape(coins: string[] = []): Promise<TapeSnapshot> {
  try {
    const ctx = await ctxMaps();
    const markets: Record<string, MarketTape> = {};
    for (const m of Object.values(TAPE_FALLBACK.markets)) putMarket(markets, m);

    for (const [key, row] of ctx) {
      const tape = rowToTape(key, row);
      if (tape) putMarket(markets, tape);
    }

    const wanted = [...new Set([...HIP3_INSTRUMENTS.map((i) => i.hl), ...coins.filter(Boolean)])].slice(0, 24);
    const candleResults = await Promise.all(
      wanted.map(async (hl) => {
        try {
          return { hl, c: await candles4h(hl) };
        } catch {
          return { hl, c: null };
        }
      }),
    );
    for (const { hl, c } of candleResults) {
      if (!c) continue;
      const existing = markets[hl] ?? markets[hl.includes(":") ? hl.slice(hl.indexOf(":") + 1) : hl];
      const row = ctx.get(hl) ?? ctx.get(hl.includes(":") ? hl.slice(hl.indexOf(":") + 1) : hl);
      const mark = row?.mark || c.last || existing?.mark || 0;
      if (!mark) continue;
      const prev = row?.prev || existing?.prevDayPx || mark;
      const asset = findHlAsset(hl);
      const next: MarketTape = {
        symbol: asset?.symbol ?? existing?.symbol ?? (hl.includes(":") ? hl.slice(hl.indexOf(":") + 1) : hl),
        hl: asset?.hl ?? existing?.hl ?? hl,
        mark,
        prevDayPx: prev,
        dayPct: prev ? (mark - prev) / prev : existing?.dayPct ?? 0,
        dayNtlVlm: row?.vlm || existing?.dayNtlVlm || 0,
        range4h: c.range4h || existing?.range4h || 0.01,
        range24h: c.range24h || existing?.range24h || 0.015,
        vol4h: c.vol4h || (row?.vlm ?? 0) / 6 || existing?.vol4h || 0,
        funding: row?.funding ?? existing?.funding ?? 0,
        source: "live",
      };
      putMarket(markets, next);
    }

    return { at: new Date().toISOString(), source: "live", markets };
  } catch {
    return TAPE_FALLBACK;
  }
}
