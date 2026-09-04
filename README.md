# E8 Trade · 40% Consistency Rule Solution

Operator-grade planner and live cut-now desk for [E8 Markets Terminal](https://trade.e8markets.com/trade). Built so a trader who just passed evaluation can type the money they want from a **$5K–$500K E8 One** funded book and get, in dollars:

1. How much they can **risk per trade**
2. How much they should **make per trade**
3. **How many trades** remain before the target is payable
4. What a **15x full-port** with a tight stop does to daily drawdown **and** to the 40% best-day rule
5. The **most realistic path** (three similar days — E8’s own copy)

Live: every booked profit or loss (pulled from Trade History, **net of fees**) restates best-day **share**, remaining trades, and whether the last winner just **raised the bar**.

Canonical rule: [40% Best Day Rule](https://help.e8markets.com/en/articles/10450125-40-best-day-rule) (Intercom `10450125`). Terminal docs: [trade.e8markets.com/docs](https://trade.e8markets.com/docs).

This repository is the handoff for the E8 Markets Terminal team. Ship it as a right-rail on `/trade` and as a panel inside **Analytics**.

---

## Why this exists — the rule is misunderstood, not a scam

The 40% best-day rule is the most-attacked line in E8’s product. On Trustpilot, Reddit, affiliate Discords, and competitor landing pages it is framed as a hidden gotcha: “they won’t pay you after you win.” That framing is the **attack vector**. The rule itself is not a scam.

What the rule actually does (verbatim from the help center):

> With a 40% Best Day Rule, you must ensure that no single trading day exceeds more than 40% of your total generated profits.

- Applies to **E8 One** (and E8 One Crypto) **Performance stage only**. Challenge has **no** consistency rule. **E8 Pro has no consistency rule** and is not in this product.
- Evaluated at **payout request**, on the **current cycle**.
- Exceeding it does **not** fail the account. Keep trading until `best day ≤ 0.40 × cycle profit`.
- After payout, Current Best Day and Current Performance **reset**. Leftover buffer is **excluded**.
- Splitting one winner across days (partials, hedges, close/re-open) is a **prohibited bypass**. E8 may consolidate that P&L into a single day.

The attack writes itself when four things are true at once:

| Failure | What the trader sees | What actually happened |
| --- | --- | --- |
| Terminal is silent on 40% while the trade is open | A green UP&L | That print is about to become 100% of the cycle |
| Full-port 15x with a “tight SL” | “I’m protecting daily DD” | A 2R winner using daily DD as 1R **is** the best day |
| No trade-count plan after passing | “I want to make mega bucks” | One lottery ticket, then weeks of dilution |
| Support answers with the formula after the fact | “They moved the goalposts” | The goalposts were always `best ÷ 0.40` |

This product exists to make the rule a **tool**, not a trap. If a $100K E8 One trader wants $8,000 this cycle, they should see — before the first click — that:

- max best day is **$3,200**
- the payable path is **three similar days of ~$2,667** (33% each)
- risk per trade is **~$500** (0.5% of size, 12.5% of the $4,000 daily DD)
- make per trade at 2R is **~$1,000**
- expected trades at 55% WR is **~15**
- a 15x BTC full-port that uses the whole daily DD as 1R prints **$8,000 at 2R** — 100% of the target, a lock

That last line is the scam-attack in one number. Show it *before* the fill and the review never gets written.

---

## Who this helps

### E8 Markets

- **Fewer “you won’t pay me” tickets.** The dollar ceiling is visible while the position is open.
- **More eligible payouts, faster.** Traders who size to three similar days request on day 3 instead of sitting in dilution for two weeks.
- **Defensible public math.** The formula, the help-center examples, and the desk produce the same numbers.
- **Affiliate / competitor ammunition neutralized.** The attack requires opacity. A live gauge and a trade count remove it.

### E8 Markets Terminal

The terminal already shows Bal / Eqty / UP&L / Free Mrgn, Daily LL, Trail LL, Profit Tgt, and a 5% budget cap. It does **not** show:

- how much of today is still legal under 40%
- how many trades remain to a stated dollar target
- whether the open 15x ticket, if booked, raises the bar
- a next-R that fits inside remaining headroom, daily DD, and the 5% budget cap

Preferred embed: a **right-rail on `/trade`**, reading the same account group the chart is on, **and a panel in Analytics** (see below). This is a read-only overlay — it never sends orders.

### Clientele

The trader who just passed is the customer this is built for. They have a 5K, 10K, 25K, 50K, 100K, 200K, 400K, or 500K Performance book. They want to make a specific amount of money. They do not want to accidentally print a day that makes the next two weeks unpaid labor.

---

## The logic (implement this, don’t re-derive it)

Let `r = 0.40` (adjustable 20–60 on the desk; official is 40).

```
cycleProfit      = Σ closed Net PNL this cycle   (leftover buffer excluded)
bestDay          = max(closed Net PNL of any session)
bestDayShare     = bestDay / cycleProfit
eligible         = bestDayShare ≤ r   (or cycleProfit = 0)

maxBestDay       = r × targetProfit
idealDay         = targetProfit / 3          // E8 copy: three similar days
effectiveTarget  = max(targetProfit, bestDay / r, minPayout)
remainingFromBest= bestDay / r − cycleProfit // extra profit needed to dilute
maxAllowedToday  = (2/3) × otherDayProfit    // at 40%, so today stays ≤ 40% of new total
todayHeadroom    = maxAllowedToday − todayBooked
liveHeadroom     = todayHeadroom − openUP&L
closeNow         = live would make today the >40% best day
```

Worked help-center identities (must stay green in `src/lib/e8/plan.test.ts` and `history.test.ts`):

- Example A: days $500 / $550 / $600 / $700 / $800 → best $800 of $3,150 = 25.4% → **eligible**.
- Example B: best $1,500 of $3,100 = 48.4% → remaining `1500/0.40 − 3100 = $650` → new target **$3,750**.
- First day of a cycle is **never** `closeNow` — it *sets* the bar.

**Net of fees.** Trade History columns are Profit, Fee, Net PNL. The 40% engine consumes **Net PNL** (`profit − fee`). Gross and fee stay on the tape so the operator sees drag.

**Notional, not lots.** Every size field on this desk is **USD notional**. Open P&L on mark change:

```
openPnl = direction × notional × (mark − entry) / entry
```

Full-port identities (`src/lib/e8/port.ts`):

```
maxNotional        = equity × leverage
slPct vs daily DD  = dailyDrawdown / maxNotional
tradable floor     = 0.35% stop — tighter is noise, size the notional down
```

A 15x full-port on a $100K E8 One (daily DD $4,000) that uses the whole daily DD as 1R prints **$8,000 at 2R**. That is a consistency lock on an $8k target.

---

## Markets: Hyperliquid + Trade.XYZ

E8 lists **every Hyperliquid perpetual** and the **Trade.XYZ HIP-3** book (indices, equities, metals, energy, FX). The desk does not operate in lots; it sizes **USD notional** against that universe.

Snapshot (2026-09-04, `api.hyperliquid.xyz` `meta` + `perpDexs`):

| Venue | Filter | Markets |
| --- | --- | --- |
| Hyperliquid native perps | `HL` | 177 |
| Trade.XYZ HIP-3 (`xyz:SP500`, `xyz:CL`, `xyz:NVDA`, …) | `XYZ` | 119 |
| Other HIP-3 (Felix, Ventuals, HyENA, Kinetiq, …) | All | remaining |
| **Total listed** | All | **456** |

Live trade and Trade tape pickers toggle **All / Hyperliquid / Trade.XYZ**. The **Markets** page lists the full book with class filters (crypto, indices, equities, metals, energy, FX).

The 2026-09-04 Chief HL $500K session rotated **BTCUSD → SP500 HIP-3** at 15x, **$1,239,328 notional**. That ticket is the sample live position.

---

## Analytics section (this is where it belongs)

Terminal Analytics already has:

- Journaling: Day / Week / Trades + monthly P&L calendar
- Per-day: total trades, **net P&L**, win rate, volume, profit factor
- Trader Score: Execution Quality, Risk Integrity, Session Repeatability, Revenge Control, Regime Robustness

**What is missing** is a consistency pane that answers, on the same account:

| Analytics question | This desk |
| --- | --- |
| How much have I made **today** (net of fees)? | `todayBooked` from Trade History rollup |
| What is **current cycle profit** vs leftover buffer? | `cycleProfit`, leftover excluded |
| How far is the **next trade** from exceeding 40%? | `todayHeadroom` / `liveHeadroom` |
| Am I still **payout-eligible**? | `bestDayShare ≤ 0.40` |
| Given my win rate, R:R, avg win / avg loss — what is a **sustainable** next ticket? | `planCycle()` + coach cards |
| Should I **flatten now**? | `closeNow` red alert using the same Daily LL / budget cap the terminal already has |

Recommended placement:

1. **Analytics → Overview** — the gauge + “I want to make $X” planner (the page the trader sees after they pass).
2. **Analytics → Journal → Day** — booked days table (Profit / Fee / Net PNL) fed by Trade History, not a manual form.
3. **Trade right-rail** — live position, notional, cut-now alert. Reads `e8_positions_list` + mark from the chart.

MCP feeds already exist (`read:trade`):

| Feed | Maps to |
| --- | --- |
| `e8_account_info` | Bal, Eqty, leftover buffer |
| `e8_account_limits` | Daily LL, trail DD, profit target |
| `e8_positions_list` | Live notional, UP&L, symbol, side |
| `e8_orders_list` (FILLED / SETTLED) | Trade History → day rollup |
| `e8_analytics_account` | Win rate, R, expectancy, consistency section |
| `e8_trade_asset_list` / `e8_trade_asset_get` | HL + XYZ universe + live marks |

Session date must match **E8’s trading day**, not the browser TZ, once wired. On payout, call `resetCycle()`.

This overlay **never sends orders**. `trade:execute` is out of scope.

---

## Product surface

| Route | Job |
| --- | --- |
| `/` Plan | Passed → type the money you want → risk / win / trade count / path |
| `/desk` | Live cut-now. Booked days from Trade History. Tape + live ticket in USD notional |
| `/markets` | Full HL + Trade.XYZ universe, venue and class toggles |
| `/catalog` | E8 One perpetual books $5K–$500K (Pro omitted — no consistency rule) |
| `/rule` | The article, in operator language |

Account sizes: **5K, 10K, 25K, 50K, 100K, 200K, 400K, 500K**.

---

## Engine map (for the terminal team)

```
src/lib/e8/consistency.ts   40% identities (help 10450125)
src/lib/e8/plan.ts          funded-target planner, PathKind
src/lib/e8/port.ts          full-port notional / tight SL vs daily DD
src/lib/e8/history.ts       Trade History → Net PNL day rollup
src/lib/e8/history.server.ts  MCP e8_orders_list, fallback replay
src/lib/e8/hl-universe.ts   456 HL + XYZ (+ other HIP-3) markets
src/lib/e8/catalog.ts       E8 One only
src/lib/e8/analytics.ts     win rate, R, expectancy, coach cards
```

Tests (must stay green):

```
npm test   # includes plan.test.ts, history.test.ts, hl-universe.test.ts
```

---

## Local

```
npm install
npm run dev      # 0.0.0.0:8080
npm test
npm run build
```

Optional env for live MCP:

```
E8_API_KEY        # Settings → API Keys, scope read:trade
E8_ACCOUNT_ID     # account group the chart is on
```

Without a key the desk replays a scaled Trade History of the 2026-09-04 Chief HL $500K session so the gauge still moves.

---

## What “done” looks like on the terminal

A Performance user on a $100K E8 One, 15x SP500 HIP-3, $1.24M notional:

1. Opens Analytics. Sees **cycle net**, **best-day share**, **headroom on the next ticket**.
2. Types “I want $8,000 this cycle.” Gets three similar days of ~$2,667, **$500 risk**, **$1,000 win**, ~15 trades at 55% WR.
3. Full-port panel says **do not full-port** — a 2R using daily DD as 1R is 100% of the target.
4. Live ticket: if UP&L would push today through 40%, **red alert — flatten now**.
5. They request payout on a cycle that is already eligible. No ticket, no “scam” thread, no two weeks of dilution.
