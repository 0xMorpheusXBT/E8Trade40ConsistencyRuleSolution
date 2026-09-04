import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type TradableAssetRow = {
  terminal_symbol: string;
  ticker: string;
  hl: string;
  dex: string;
  venue: string;
  name: string;
  asset_class: string;
  book: string;
  max_leverage: number;
  terminal_url: string;
};

export const listTradableAssets = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<TradableAssetRow>`
    select terminal_symbol, ticker, hl, dex, venue, name, asset_class, book, max_leverage, terminal_url
    from tradable_assets
    order by book, ticker
  `;
});

export const tradableAssetCounts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ book: string; n: number }>`
    select book, count(*)::int as n from tradable_assets group by book
  `;
  const by = Object.fromEntries(rows.map((r) => [r.book, Number(r.n)]));
  const hl = Number(by["hl-perp"] ?? 0);
  const xyz = Number(by["hip3-xyz"] ?? 0);
  return { hl, xyz, total: hl + xyz };
});
