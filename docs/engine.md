# Engine identities

Canonical article: [40% Best Day Rule](https://help.e8markets.com/en/articles/10450125-40-best-day-rule) (Intercom `10450125`).

Let `r = 0.40` (desk allows 20–60; official is 40).

```
cycleProfit      = Σ closed Net PNL this cycle   (leftover buffer excluded)
bestDay          = max(closed Net PNL of any session)
bestDayShare     = bestDay / cycleProfit
eligible         = bestDayShare ≤ r   (or cycleProfit = 0)

maxBestDay       = r × targetProfit
idealDay         = targetProfit / 3          // E8 copy: three similar days
effectiveTarget  = max(targetProfit, bestDay / r, minPayout)
remainingFromBest= bestDay / r − cycleProfit
maxAllowedToday  = (r / (1−r)) × profitExToday
                 = (2/3) × otherDayProfit    // at r = 0.40
todayHeadroom    = maxAllowedToday − todayBooked
liveHeadroom     = todayHeadroom − openUP&L
closeNow         = live would make today the >40% best day
```

Worked help-center identities (must stay green in `src/lib/e8/engine/plan.test.ts`):

- **Example A:** days $500 / $550 / $600 / $700 / $800 → best $800 of $3,150 = 25.4% → **eligible**.
- **Example B:** best $1,500 of $3,100 = 48.4% → remaining `1500/0.40 − 3100 = $650` → new target **$3,750**.
- **First day** of a cycle is **never** `closeNow` — it *sets* the bar.

## Path kinds (`planCycle`)

| `PathKind` | Meaning |
| --- | --- |
| `three-similar` | E8’s own copy. Three days inside the 40% ceiling. |
| `dilute-first` | A fat day already happened. Print elsewhere until `best ≤ r × cycle`. |
| `raised-bar` | Best day exceeded 40% of the *stated* goal, so the goal is now `best / r`. |
| `min-payout` | Stated target is below the product’s minimum payout. Floor binds. |
| `too-aggressive` | Suggested 1R would eat daily DD too fast. Size down. |
| `locked-today` | Today is already at/over the legal share. Flatten / no add. |

## Full-port (`sizeFullPort`)

```
maxNotional        = min(equity × leverage × marginUse, venueMaxNotional)
slPct vs daily DD  = dailyDrawdown / maxNotional
tradable floor     = 0.35% stop — tighter is noise, size the notional down
```

A 15x full-port on a $100K E8 One (daily DD $4,000) that uses the whole daily DD as 1R prints **$8,000 at 2R**. That is a consistency lock on an $8k target.

## Plan of Attack (`planAttack`)

```
notional           = sizedNotional(equity, leverage, marginUse, maxNotional)
movePct to goal    = remaining / notional
SL vs daily DD     = dailyDrawdown / notional
4h expansion $     = notional × mean((H−L)/C) of recent 4h bars
atrUnits           = movePct / range4h
fit                = one-print | few-prints | grind | too-thin | locks-40
probability        = f(expansion fit, 24h volume, 4h volume, 40% cap)
```

Eval remaining is `9% × size − cycleProfit` (no 40% cap). Funded remaining is `effectiveTarget − cycleProfit`. A 4h expansion that prints more than `maxBestDay` is tagged **locks-40**.

Open P&L on mark change (USD notional, never lots):

```
openPnl = direction × notional × (mark − entry) / entry
```
