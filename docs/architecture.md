# Architecture

This repo is the handoff for [E8 Markets Terminal](https://trade.e8markets.com/trade). Two surfaces, **one engine**.

```
┌──────────────────────────────────────────────────────────────┐
│  Surfaces                                                    │
│  /            Plan — type the money you want                 │
│  /desk        Live cut-now + booked days (net of fees)       │
│  /analytics   Plan of Attack (sprint / measured / vol)       │
│  /markets     308 HL perps + Trade.XYZ, live marks           │
│  /catalog     E8 One $5K–$500K (Pro omitted)                 │
│  /rule        40% Best Day Rule in operator language         │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  src/lib/e8  (copy these files — no React)                   │
│                                                              │
│  engine/     evaluateConsistency, planCycle, planAttack      │
│  markets/    contractLimits, HL_UNIVERSE (308)               │
│  tape/       tapeFor, rollupDays (Net PNL = profit − fee)    │
│  state/      demo store only                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   Trade History      Hyperliquid info    E8 MCP
   e8_orders_list     metaAndAssetCtxs    e8_account_*
   Net PNL / day      227 + 81 marks      positions / limits
```

## Folder contract

| Path | Owns | Terminal embed |
| --- | --- | --- |
| `src/lib/e8/engine` | 40% math, path planner, attack ranking, full-port SL | **Yes — copy** |
| `src/lib/e8/markets` | Leverage / $1.30M notional, 308-market book | **Yes — copy** |
| `src/lib/e8/tape` | HL + XYZ tape, Trade History rollup | **Yes — copy** |
| `src/lib/e8/state` | Zustand persist for this demo | No — use terminal account state |
| `src/components/desk` | Operator UI (gauge, live ticket, attack table) | Reference density / copy, not CSS |
| `src/routes` | TanStack Start pages | Thin wrappers |
| `migrations/0002_e8_tradable_assets.sql` | Unowned `tradable_assets` catalog | Optional — book also ships as `e8-book.ts` |
| `docs/` | This map, engine identities, markets contract, embed steps | Read first |

## Rules that must not drift

1. **E8 One Performance only.** Challenge has no 40% cap. E8 Pro is out of scope.
2. **Net of fees.** `netPnl = profit − fee`. Never feed gross into the 40% engine.
3. **USD notional, never lots.**
4. **HIP-3 venue cap is $1.30M.** Copper is 8x. Equities 5x. EUR/JPY 25x. BTC/ETH/SOL 15x.
5. **308 markets.** `HL_PERP_*` (227) + `HL_HIP3_XYZ_*` (81). No PARA, no CEX CFD.
6. **Splitting a winner across days is a prohibited bypass.**

See [engine.md](./engine.md), [markets.md](./markets.md), [terminal-embed.md](./terminal-embed.md).
