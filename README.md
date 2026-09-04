# 40% Consistency Strategy

Operator-grade planner, live cut-now desk, and community calculator for [E8 Markets Terminal](https://trade.e8markets.com/trade).

The official E8 constraint is the **[40% Best Day Rule](https://help.e8markets.com/en/articles/10450125-40-best-day-rule)** (Intercom `10450125`). This product is the **strategy** that sits on top of it: type the money you want, see the path that stays payable, and get told to flatten **before** a winner locks the cycle.

This repository is the handoff for the E8 Markets Terminal team. Ship it as:

1. A panel inside **Analytics** (primary home — same family as Journaling / Trader Score)
2. A **right-rail on `/trade`** (live cut-now, notional, SL vs daily DD)
3. A **public / community tool** traders can use on their own — the Breakout-style calculator, but wired to the same identities the terminal will run

Canonical sources:

- Rule: [help.e8markets.com · 40% Best Day Rule](https://help.e8markets.com/en/articles/10450125-40-best-day-rule)
- Terminal docs: [trade.e8markets.com/docs](https://trade.e8markets.com/docs)
- Offerings: [e8markets.com · Perpetual · E8 One](https://e8markets.com/?market=perpetual#accounts)
- Live desk: [trade.e8markets.com/trade](https://trade.e8markets.com/trade)

---

## Why “Strategy”, not “Rule”

The rule is a payout filter. The strategy is what a serious trader actually needs:

- **Eval sprint** — how much price has to move, at what notional, to pass the 9% target in one or two 4h expansions
- **Funded print** — how much is still left to make, capped so no day becomes more than 40% of the cycle
- **Measured grind** — partial margin, winner count, R:R, stay under 40% on purpose
- **Vol hunter** — which HIP-3 / Trade.XYZ market is the most probable next print given implied expansion, 4h volume, and 24h range

Calling it a rule puts the constraint in the trader’s face. Calling it a strategy puts the **path** in their face. That is the whole product.

E8 Pro is out of scope. **There is no consistency rule on Pro.** This desk is E8 One (and E8 One Crypto) Performance only. Challenge has no 40% cap either — the eval sprint still uses the 9% profit target.

---

## Why this exists — the rule is misunderstood, not a scam

The 40% best-day rule is the most-attacked line in E8’s product. On Trustpilot, Reddit, affiliate Discords, and competitor landing pages it is framed as a hidden gotcha: “they won’t pay you after you win.” That framing is the **attack vector**. The rule itself is not a scam.

What the rule actually does (verbatim from the help center):

> With a 40% Best Day Rule, you must ensure that no single trading day exceeds more than 40% of your total generated profits.

Facts that must stay in the UI, the README, and the code comments:

| Fact | Consequence |
| --- | --- |
| Applies to **E8 One Performance only** | Challenge: no cap. Pro: do not show this desk. |
| Evaluated at **payout request**, on the **current cycle** | Not a breach. Not a fail. Keep trading until `best ≤ 0.40 × cycle`. |
| After payout, Current Best Day and Current Performance **reset** | Leftover buffer is **excluded** from the next cycle. |
| Splitting one winner across days is a **prohibited bypass** | Partials, hedges, close/re-open — E8 may consolidate that P&L into one day. |
| Net of fees | Trade History columns are Profit, Fee, **Net PNL**. The engine consumes Net. |

The attack writes itself when four things are true at once:

| Failure | What the trader sees | What actually happened |
| --- | --- | --- |
| Terminal is silent on 40% while the trade is open | A green UP&L | That print is about to become 100% of the cycle |
| Full-port 15x with a “tight SL” | “I’m protecting daily DD” | A 2R winner using daily DD as 1R **is** the best day |
| No trade-count plan after passing | “I want to make mega bucks” | One lottery ticket, then weeks of dilution |
| Support answers with the formula after the fact | “They moved the goalposts” | The goalposts were always `best ÷ 0.40` |

This product exists to make the constraint a **tool**, not a trap. If a $100K E8 One trader wants $8,000 this cycle, they should see — before the first click — that:

- max best day is **$3,200**
- the payable path is **three similar days of ~$2,667** (33% each)
- risk per trade is **~$500** (0.5% of size, 12.5% of the $4,000 daily DD)
- make per trade at 2R is **~$1,000**
- expected trades at 55% WR is **~15**
- a 15x BTC full-port that uses the whole daily DD as 1R prints **$8,000 at 2R** — 100% of the target, a lock

That last line is the scam-attack in one number. Show it *before* the fill and the review never gets written.

---

## Who this is for

### E8 Markets

- Fewer “you won’t pay me” tickets. The dollar ceiling is visible while the position is open.
- More eligible payouts, faster. Traders who size to three similar days request on day 3 instead of sitting in dilution for two weeks.
- Defensible public math. The formula, the help-center examples, and the desk produce the same numbers.
- Affiliate / competitor ammunition neutralized. The attack requires opacity. A live gauge and a trade count remove it.

### E8 Markets Terminal

The terminal already shows Bal / Eqty / UP&L / Free Mrgn, Daily LL, Trail LL, Profit Tgt, and a 5% budget cap. It does **not** show:

- how much of today is still legal under 40%
- how many trades remain to a stated dollar target
- whether the open 15x ticket, if booked, raises the bar
- a next-R that fits inside remaining headroom, daily DD, and the 5% budget cap
- which HIP-3 market’s 4h expansion actually covers the remaining dollars

Preferred embed: **Analytics** (this is an analysis product) **and** a read-only right-rail on `/trade`. It never sends orders.

### Clientele — the trader who just passed

They have a 5K, 10K, 25K, 50K, 100K, 200K, 400K, or 500K Performance book. They want to make a specific amount of money. They do not want to accidentally print a day that makes the next two weeks unpaid labor.

Three desks, one remaining number:

| Desk | Who | What they get |
| --- | --- | --- |
| **Full-port sprint** | Pass eval now, or dump the funded print | Tight SL. One or two 4h expansions. “Do not full-port” when a 2R locks 40%. |
| **Measured** | Partial margin, slow | Winner count, R:R, margin slider, stay under 40% on purpose. |
| **Vol hunter** | What’s pumping | Ranked by implied vol, 4h expansion, 4h volume, 24h move. Probability that this tape covers the remaining dollars. |

### Community tool (the Breakout analogue)

Breakout-style calculators work because they are **shareable, standalone, and honest**. A trader should be able to open this without a live account, pick `$100K`, type `$8,000`, and leave with a path. Same math as the terminal. No “demo vs live” split. When we later embed it in Analytics, the public tool and the terminal pane must not diverge — that is why the identities live in `src/lib/e8/*.ts` with tests, not in React.

Ship the community surface as this repo. Ship the terminal surface as a thin wrapper that feeds MCP account state into the same functions.

---

## Parameters (the only knobs)

| Parameter | Official default | Range on this desk | Where it binds |
| --- | --- | --- | --- |
| Consistency ratio `r` | **40%** | 20–60, step 5 | `evaluateConsistency`, `planCycle` |
| Account size | $5K–$500K E8 One | 5 / 10 / 25 / 50 / 100 / 200 / 400 / 500K | `catalog.ts` |
| Stage | Performance (rule on) | Challenge / Performance | Challenge: remaining = 9% target, no 40% cap |
| Profit target (eval) | **9%** of size | from offering | Challenge remaining |
| Daily drawdown | **4%** of equity | from offering | 1R ceiling, full-port SL |
| Max drawdown | **6%** trailing | from offering | risk cap |
| Budget cap | **5%** of equity | from offering | notional ceiling |
| Payout share | **80%** | from offering | take-home |
| Min payout | 3-day first payout window | from offering | floor on effective target |
| Target profit (funded) | default `max(8% of size, 3 × min payout)` | trader types it | `planCycle` |
| Win rate | 55% seed | trader | expected trades |
| Reward / risk | 2R seed | trader | suggested win = risk × R |
| Trades / day | 2 seed | trader | sessions remaining |
| Margin used | 100% sprint / 25% measured | 10–100% | Plan of Attack notional |
| HIP-3 leverage | **15x** (Copper **8x**) | instrument book | `instruments.ts` |
| CEX crypto | **1x** | official E8 One | contrast chip |
| FX | **30x** | official E8 One | contrast chip |
| Tradable SL floor | **0.35%** | constant | tighter is noise — size notional down |
| Booked P&L | **Net of fees** | `profit − fee` | never use gross for 40% |

Account sizes and E8 One sale prices (scraped 2026-09-04, 50% off code E8):

| Size | Sale | 9% target | 4% daily DD | 6% trail |
| --- | ---: | ---: | ---: | ---: |
| 5K | $24 | $450 | $200 | $300 |
| 10K | $44 | $900 | $400 | $600 |
| 25K | $94 | $2,250 | $1,000 | $1,500 |
| 50K | $144 | $4,500 | $2,000 | $3,000 |
| 100K | $244 | $9,000 | $4,000 | $6,000 |
| 200K | $399 | $18,000 | $8,000 | $12,000 |
| 400K | $799 | $36,000 | $16,000 | $24,000 |
| 500K | $999 | $45,000 | $20,000 | $30,000 |

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
maxAllowedToday  = (r / (1−r)) × profitExToday
                 = (2/3) × otherDayProfit    // at r = 0.40
todayHeadroom    = maxAllowedToday − todayBooked
liveHeadroom     = todayHeadroom − openUP&L
closeNow         = live would make today the >40% best day
```

Worked help-center identities (must stay green in `src/lib/e8/plan.test.ts` and `history.test.ts`):

- **Example A:** days $500 / $550 / $600 / $700 / $800 → best $800 of $3,150 = 25.4% → **eligible**.
- **Example B:** best $1,500 of $3,100 = 48.4% → remaining `1500/0.40 − 3100 = $650` → new target **$3,750**.
- **First day** of a cycle is **never** `closeNow` — it *sets* the bar.

Path kinds returned by `planCycle()`:

| `PathKind` | Meaning |
| --- | --- |
| `three-similar` | E8’s own copy. Three days inside the 40% ceiling. |
| `dilute-first` | A fat day already happened. Print elsewhere until `best ≤ r × cycle`. |
| `raised-bar` | Best day exceeded 40% of the *stated* goal, so the goal is now `best / r`. |
| `min-payout` | Stated target is below the product’s minimum payout. Floor binds. |
| `too-aggressive` | Suggested 1R would eat daily DD too fast. Size down. |
| `locked-today` | Today is already at/over the legal share. Flatten / no add. |

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

Plan of Attack identities (`src/lib/e8/attack.ts`):

```
notional           = equity × leverage × marginUse
movePct to goal    = remaining / notional
SL vs daily DD     = dailyDrawdown / notional
4h expansion $     = notional × mean((H−L)/C) of recent 4h bars
atrUnits           = movePct / range4h
fit                = one-print | few-prints | grind | too-thin | locks-40
probability        = f(expansion fit, 24h volume, 4h volume, 40% cap)
```

Eval remaining is `9% × size − cycleProfit` (no 40% cap). Funded remaining is `effectiveTarget − cycleProfit`, and a 4h expansion that prints more than `maxBestDay` is tagged **locks-40**.

---

## Markets: official E8 Hyperliquid book

Only what E8 actually lists on the terminal. Source: `e8_tradable_assets.csv` **rows 73–380**.

| Book | Count | Terminal prefix | HL name |
| --- | ---: | --- | --- |
| Native Hyperliquid perps | **227** | `HL_PERP_*` | `BTC`, `ETH`, `HYPE`, … |
| Trade.XYZ HIP-3 | **81** | `HL_HIP3_XYZ_*` | `xyz:SP500`, `xyz:CL`, `xyz:GOLD`, … |
| **Total** | **308** | | |

Out of scope on this desk: CEX FX pairs, CEX index/metal CFDs, CEX crypto futures (`BTCUSD` 1x is kept only as a contrast chip on the full-port panel), and `HL_HIP3_PARA_*`.

HIP-3 15x book the full-port panel sizes against (Copper is **8x**):

`BTC, SOL, ETH, SP500, XYZ100, CL, SILVER, GOLD, PALLADIUM, PLATINUM, COPPER, BRENTOIL, NATGAS, JP225`

The 2026-09-04 Chief HL $500K session rotated **BTCUSD → SP500 HIP-3** at 15x, **~$1.24M notional**. That ticket is the sample live position.

Postgres seed: `migrations/0002_e8_tradable_assets.sql` → table `tradable_assets` (unowned public catalog). Client universe: `src/lib/e8/e8-book.ts`. Search / venue toggle: `src/lib/e8/hl-universe.ts`.

---

## Analytics section — this is where it belongs

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
| Should I **flatten now**? | `closeNow` red alert using Daily LL / budget cap |
| Which HIP-3 market is the most probable next print? | `planAttack()` + live HL/XYZ tape |
| I passed. I want $X. How many winners, what R, what risk? | funded planner on `/` |

Recommended placement:

1. **Analytics → Overview** — the gauge + “I want to make $X” planner (the page the trader sees after they pass).
2. **Analytics → Strategy / Plan of attack** — three desks, HIP-3 tape, probability rank.
3. **Analytics → Journal → Day** — booked days table (Profit / Fee / Net PNL) fed by Trade History, not a manual form.
4. **Trade right-rail** — live position, notional, cut-now alert. Reads `e8_positions_list` + mark from the chart.

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

## Product surface (this repo)

| Route | Job |
| --- | --- |
| `/` Plan | Passed → type the money you want → risk / win / trade count / path + full-port + Plan of Attack |
| `/desk` | Live cut-now. Booked days from Trade History. Tape + live ticket in USD notional |
| `/analytics` | Plan of Attack. Sprint / measured / vol. Live HL + XYZ tape |
| `/markets` | Official 308-market E8 book. Venue and class toggles. Terminal ids |
| `/catalog` | E8 One perpetual books $5K–$500K (Pro omitted) |
| `/rule` | The article, in operator language |

---

## Engine map (copy these files into the terminal)

Keep this layer **framework-free**. React is the demo. The terminal should import the `src/lib/e8` functions, not the pages.

```
src/lib/e8/consistency.ts     40% identities (help 10450125)
src/lib/e8/plan.ts            funded-target planner, PathKind
src/lib/e8/port.ts            full-port notional / tight SL vs daily DD
src/lib/e8/attack.ts          Plan of Attack — sprint / measured / vol
src/lib/e8/tape.ts            4h expansion, 24h move, IV proxy
src/lib/e8/tape.server.ts     Hyperliquid info API (meta + 4h candles)
src/lib/e8/history.ts         Trade History → Net PNL day rollup
src/lib/e8/history.server.ts  MCP e8_orders_list, fallback replay
src/lib/e8/e8-book.ts         308 official E8 HL_PERP + HIP3_XYZ markets
src/lib/e8/hl-universe.ts     search, venue toggle, terminal-symbol lookup
src/lib/e8/instruments.ts     HIP-3 15x book (Copper 8x)
src/lib/e8/catalog.ts         E8 One only
src/lib/e8/analytics.ts       win rate, R, expectancy, coach cards
src/lib/e8/assets.functions.ts  Postgres tradable_assets (unowned)
migrations/0002_e8_tradable_assets.sql
```

Tests (must stay green — these *are* the spec):

```
src/lib/e8/plan.test.ts         Example A / B, 100K $8k path, 15x BTC full-port lock
src/lib/e8/history.test.ts      Net = profit − fee, UTC day grouping
src/lib/e8/attack.test.ts       Eval $9k @ 15x BTC = 0.60% one-print; Copper 8x; funded lock
src/lib/e8/hl-universe.test.ts  227 + 81 = 308, HL_PERP_BTC / HL_HIP3_XYZ_SP500
```

```
npm test
npm run typecheck
```

---

## Embedding into https://trade.e8markets.com/trade

Do not rewrite the math. Wrap it.

1. **Mount `evaluateConsistency` + `planCycle` on the account group the chart is on.** Inputs: leftover-excluded day PnL from Trade History, live UP&L from `e8_positions_list`, official 40%, current equity, daily DD, budget cap.
2. **Right-rail, trade view.** Gauge, today headroom, `closeNow`. If `closeNow`, the existing flatten control is the CTA — this overlay does not send the order.
3. **Analytics → Strategy.** The Plan of Attack table. Tape from Hyperliquid `info` (already how HIP-3 marks move). Remaining dollars from (1).
4. **Analytics → Overview.** “I want to make $X” + three-similar-days path. This is the post-pass screen.
5. **Symbol search.** Resolve both `SP500` and `HL_HIP3_XYZ_SP500`. Size in USD notional. Never lots.
6. **Booked days.** Group FILLED/SETTLED by E8 trading day. `netPnl = profit - fee`. Manual override is allowed until the next sync (`historyDirty`).
7. **On payout.** `resetCycle()`. Leftover buffer excluded.

Reference UI in this repo is the contract for density and copy, not for CSS. Match the terminal’s existing Analytics chrome (Day / Week / Trades). The numbers must match help-center Example A and Example B to the dollar.

---

## Local

```
npm install
npm run dev
npm test
npm run build
```

Optional env for live MCP:

```
E8_API_KEY        # Settings → API Keys, scope read:trade
E8_ACCOUNT_ID     # account group the chart is on
```

Without a key the desk replays a scaled Trade History of the 2026-09-04 Chief HL $500K session so the gauge still moves. Hyperliquid tape falls back to a dated snapshot if `info` is unreachable.

---

## What “done” looks like on the terminal

A Performance user on a $100K E8 One, 15x SP500 HIP-3, $1.24M notional:

1. Opens **Analytics**. Sees **cycle net**, **best-day share**, **headroom on the next ticket**.
2. Types “I want $8,000 this cycle.” Gets three similar days of ~$2,667, **$500 risk**, **$1,000 win**, ~15 trades at 55% WR.
3. Full-port panel says **do not full-port** — a 2R using daily DD as 1R is 100% of the target.
4. Plan of Attack ranks SP500 / XYZ100 as the measured path and flags a 15x BTC full-port 4h expansion as **locks 40%**.
5. Live ticket: if UP&L would push today through 40%, **red alert — flatten now**.
6. They request payout on a cycle that is already eligible. No ticket, no “scam” thread, no two weeks of dilution.

That is the product. The rule did not change. The trader can finally see it.
