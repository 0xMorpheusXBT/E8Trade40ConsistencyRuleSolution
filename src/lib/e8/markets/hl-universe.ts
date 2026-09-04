/**
 * Official E8 Markets Terminal Hyperliquid book.
 * Source: e8_tradable_assets.csv rows 73–380 — every HL_PERP_* and
 * every HL_HIP3_XYZ_*. Felix / para / CEX FX-CFD books are excluded.
 */
import { E8_BOOK } from "./e8-book.ts";
import { contractLimits } from "./limits.ts";

export type HlAssetClass = "crypto" | "index" | "fx" | "metal" | "energy" | "equity";
export type HlBook = "hl-perp" | "hip3-xyz";

export type HlAsset = {
  terminalSymbol: string;
  symbol: string;
  hl: string;
  dex: string;
  venue: string;
  name: string;
  assetClass: HlAssetClass;
  book: HlBook;
  maxLeverage: number;
  maxNotional: number;
  terminalUrl: string;
};

/** Seed row before E8 contract overlay (leverage/notional). */
export type HlAssetSeed = Omit<HlAsset, "maxNotional">;

export const HL_UNIVERSE: readonly HlAsset[] = E8_BOOK.map((a) => {
  const c = contractLimits(a);
  return { ...a, maxLeverage: c.maxLeverage, maxNotional: c.maxNotional };
});

const BY_HL = new Map(HL_UNIVERSE.map((a) => [a.hl.toUpperCase(), a]));
const BY_TERMINAL = new Map(HL_UNIVERSE.map((a) => [a.terminalSymbol.toUpperCase(), a]));

export const FEATURED_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "HYPE",
  "GOLD",
  "CL",
  "XYZ100",
  "JP225",
  "SP500",
  "NVDA",
  "EUR",
  "XRP",
] as const;

export function findHlAsset(q: string | undefined | null): HlAsset | undefined {
  if (!q) return undefined;
  const k = q.trim().toUpperCase();
  const byTerm = BY_TERMINAL.get(k);
  if (byTerm) return byTerm;
  const byHl = BY_HL.get(k);
  if (byHl) return byHl;
  for (const a of HL_UNIVERSE) {
    if (a.symbol.toUpperCase() === k) return a;
  }
  return undefined;
}

export function searchHlAssets(q: string, limit = 50, venue: VenueFilter = "all"): HlAsset[] {
  const k = q.trim().toUpperCase();
  const pool = HL_UNIVERSE.filter((a) => inVenue(a, venue));
  if (!k) {
    const featured: HlAsset[] = [];
    const seen = new Set<string>();
    for (const s of FEATURED_SYMBOLS) {
      const a = pool.find((x) => x.symbol === s) ?? (venue === "all" ? findHlAsset(s) : undefined);
      if (a && inVenue(a, venue) && !seen.has(a.hl)) {
        seen.add(a.hl);
        featured.push(a);
      }
    }
    for (const a of pool) {
      if (featured.length >= limit) break;
      if (seen.has(a.hl)) continue;
      seen.add(a.hl);
      featured.push(a);
    }
    return featured.slice(0, limit);
  }

  const scored: { a: HlAsset; score: number }[] = [];
  for (const a of pool) {
    const sym = a.symbol.toUpperCase();
    const hl = a.hl.toUpperCase();
    const term = a.terminalSymbol.toUpperCase();
    const ticker = hl.includes(":") ? hl.slice(hl.indexOf(":") + 1) : hl;
    let score = 0;
    if (sym === k || hl === k || ticker === k || term === k) score = 100;
    else if (sym.startsWith(k) || ticker.startsWith(k) || term.startsWith(k) || term.endsWith("_" + k)) score = 80;
    else if (hl.startsWith(k)) score = 70;
    else if (sym.includes(k) || ticker.includes(k) || term.includes(k)) score = 40;
    else if (
      hl.includes(k) ||
      a.venue.toUpperCase().includes(k) ||
      a.assetClass.toUpperCase().startsWith(k) ||
      a.dex.toUpperCase() === k ||
      a.name.toUpperCase().includes(k)
    ) {
      score = 20;
    }
    if (score) scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score || x.a.symbol.localeCompare(y.a.symbol) || x.a.dex.localeCompare(y.a.dex));
  return scored.slice(0, limit).map((s) => s.a);
}

export const HL_COUNT = HL_UNIVERSE.length;
export const HL_SYMBOLS: readonly string[] = HL_UNIVERSE.map((a) => a.symbol);
export const HL_NATIVE = HL_UNIVERSE.filter((a) => a.dex === "native");
export const XYZ_UNIVERSE = HL_UNIVERSE.filter((a) => a.dex === "xyz");
export const HL_NATIVE_COUNT = HL_NATIVE.length;
export const XYZ_COUNT = XYZ_UNIVERSE.length;

export type VenueFilter = "all" | "hl" | "xyz";

export function venueOf(a: HlAsset): VenueFilter {
  return a.dex === "xyz" ? "xyz" : a.dex === "native" ? "hl" : "all";
}

export function inVenue(a: HlAsset, venue: VenueFilter): boolean {
  if (venue === "all") return true;
  if (venue === "hl") return a.dex === "native";
  return a.dex === "xyz";
}
