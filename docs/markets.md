# Markets & contract limits

Source of truth: E8 Terminal Markets screenshots (2026-09-04) + `e8_tradable_assets.csv` rows 73–380.

Only what E8 actually lists. Native Hyperliquid perps (`HL_PERP_*`, 227) and Trade.XYZ HIP-3 (`HL_HIP3_XYZ_*`, 81). **308 total.**

Out of scope: CEX FX/index/metal CFDs, CEX crypto futures, `HL_HIP3_PARA_*`.

## Leverage × notional (`src/lib/e8/markets/limits.ts`)

| Book | Leverage | Max notional |
| --- | ---: | ---: |
| BTC / ETH / SOL (native) | **15x** | uncapped on native |
| Indices — SP500, XYZ100, JP225, ES, NQ, … | **15x** | **$1.30M** |
| Energy — CL, BRENTOIL, NATGAS | **15x** | **$1.30M** |
| Precious metals — GOLD, SILVER, PLATINUM, PALLADIUM | **15x** | **$1.30M** |
| Copper + other commodities | **8x** | **$1.30M** |
| HIP-3 FX — EUR, JPY / USDJPY | **25x** | **$1.30M** |
| Stocks / equities (HL_HIP3_XYZ or HL_PERP equity) | **5x** | **$1.30M** |

`sizedNotional(equity, leverage, marginUse, maxNotional)` clips HIP-3 at $1.30M. Native BTC on a $100K book at 15x × 100% is $1.50M. SP500 on the same book is **$1.30M**.

SP500 is not special. SP500, XYZ100 and JP225 are the same contract. Live Trade does not default to SP500.

## Tape

`pullMarketTape()` hits `api.hyperliquid.xyz/info`:

- native `metaAndAssetCtxs`
- `dex: "xyz"` `metaAndAssetCtxs` (universe names are `xyz:SP500`, `xyz:NVDA`, …)
- 4h `candleSnapshot` for the HIP-3 attack set

Every E8-book ticker is indexed under `symbol`, `hl`, and `xyz:NAME` so the picker hydrates mark/entry for all 308.

## HIP-3 attack set

`BTC, SOL, ETH, SP500, XYZ100, CL, SILVER, GOLD, PALLADIUM, PLATINUM, COPPER, BRENTOIL, NATGAS, JP225`

Copper is the only metal on this desk below 15x.
