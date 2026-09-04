import { HIP3_INSTRUMENTS } from "./instruments";
import { TAPE_FALLBACK, type MarketTape, type TapeSnapshot } from "./tape";

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
  const timer = setTimeout(() => ctrl.abort(), 7000);
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

async function ctxMaps(): Promise<Map<string, { mark: number; prev: number; vlm: number; funding: number }>> {
  const out = new Map<string, { mark: number; prev: number; vlm: number; funding: number }>();
  const packs: { dex?: string }[] = [{}, { dex: "xyz" }];
  for (const p of packs) {
    const body = p.dex ? { type: "metaAndAssetCtxs", dex: p.dex } : { type: "metaAndAssetCtxs" };
    const raw = (await post(body)) as [HlMeta, HlCtx[]];
    const [meta, ctxs] = raw;
    for (let i = 0; i < meta.universe.length; i++) {
      const u = meta.universe[i];
      if (u.isDelisted) continue;
      const c = ctxs[i] ?? {};
      out.set(u.name, {
        mark: num(c.markPx),
        prev: num(c.prevDayPx),
        vlm: num(c.dayNtlVlm),
        funding: num(c.funding),
      });
    }
  }
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

function displaySymbol(hl: string): string {
  return hl.includes(":") ? hl.slice(hl.indexOf(":") + 1) : hl;
}

export async function pullMarketTape(coins: string[]): Promise<TapeSnapshot> {
  const wanted = [...new Set([...HIP3_INSTRUMENTS.map((i) => i.hl), ...coins])].slice(0, 36);
  try {
    const ctx = await ctxMaps();
    const markets: Record<string, MarketTape> = { ...TAPE_FALLBACK.markets };
    const candleResults = await Promise.all(
      wanted.map(async (hl) => {
        try {
          const c = await candles4h(hl);
          return { hl, c };
        } catch {
          return { hl, c: null };
        }
      }),
    );
    for (const { hl, c } of candleResults) {
      const row = ctx.get(hl);
      const fallback = Object.values(markets).find((m) => m.hl === hl);
      const mark = row?.mark || c?.last || fallback?.mark || 0;
      const prev = row?.prev || fallback?.prevDayPx || mark;
      const symbol = displaySymbol(hl);
      markets[symbol] = {
        symbol,
        hl,
        mark,
        prevDayPx: prev,
        dayPct: prev ? (mark - prev) / prev : 0,
        dayNtlVlm: row?.vlm || fallback?.dayNtlVlm || 0,
        range4h: c?.range4h || fallback?.range4h || 0.01,
        range24h: c?.range24h || fallback?.range24h || 0.015,
        vol4h: c?.vol4h || (row?.vlm ?? 0) / 6 || fallback?.vol4h || 0,
        funding: row?.funding ?? 0,
        source: "live",
      };
    }
    return { at: new Date().toISOString(), source: "live", markets };
  } catch {
    return TAPE_FALLBACK;
  }
}
