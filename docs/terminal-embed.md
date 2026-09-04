# Embedding into trade.e8markets.com

Do not rewrite the math. Wrap it.

Preferred homes:

1. **Analytics → Overview** — gauge + “I want to make $X” (post-pass screen)
2. **Analytics → Strategy / Plan of attack** — sprint / measured / vol + live tape
3. **Analytics → Journal → Day** — booked days from Trade History (Profit / Fee / **Net PNL**)
4. **Trade right-rail** — live position, notional, `closeNow`. Reads `e8_positions_list`. Never sends orders.

## Wire-up

1. Mount `evaluateConsistency` + `planCycle` on the account group the chart is on.
   Inputs: leftover-excluded day PnL from Trade History, live UP&L from `e8_positions_list`, official 40%, current equity, daily DD, budget cap.
2. Right-rail, trade view. Gauge, today headroom, `closeNow`. If `closeNow`, the existing flatten control is the CTA.
3. Analytics → Strategy. `planAttack()` + tape from Hyperliquid `info`. Remaining dollars from (1).
4. Symbol search. Resolve both `SP500` and `HL_HIP3_XYZ_SP500`. Size in USD notional. Never lots.
5. Booked days. Group FILLED/SETTLED by **E8 trading day**. `netPnl = profit - fee`.
6. On payout. `resetCycle()`. Leftover buffer excluded.

## MCP feeds (`read:trade`)

| Feed | Maps to |
| --- | --- |
| `e8_account_info` | Bal, Eqty, leftover buffer |
| `e8_account_limits` | Daily LL, trail DD, profit target |
| `e8_positions_list` | Live notional, UP&L, symbol, side |
| `e8_orders_list` (FILLED / SETTLED) | Trade History → day rollup |
| `e8_analytics_account` | Win rate, R, expectancy |
| `e8_trade_asset_list` / `e8_trade_asset_get` | HL + XYZ universe + live marks |

`trade:execute` is out of scope.

Copy `src/lib/e8/engine`, `src/lib/e8/markets`, `src/lib/e8/tape`. Leave `src/lib/e8/state` behind — the terminal already has account state.
