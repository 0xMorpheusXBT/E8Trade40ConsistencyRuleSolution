/**
 * E8 One perpetual offerings only. E8 Pro has no 40% consistency rule
 * and is not listed here.
 */
import { ACCOUNT_SIZES, OFFERINGS, PRODUCT_META, SCRAPE, guardrailsFor } from "@/lib/e8/catalog";
import { fmtMoney, fmtSize } from "@/lib/e8/format";

export function CatalogGrid() {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Perpetual market · scraped {SCRAPE.scrapedAt}</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance">E8 One perpetual books</h1>
        <p className="mt-3 text-muted text-pretty">
          Source {SCRAPE.source}. Prices shown at {SCRAPE.promo.offPct}% off with code {SCRAPE.promo.code}. Guardrails
          taken from the $500K configurator and scaled by size. Official 40% Best Day Rule applies on E8 One
          Performance. E8 Pro is not listed — that product has no consistency rule.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">{PRODUCT_META["e8-one"].label}</h2>
          <p className="text-sm text-muted">{PRODUCT_META["e8-one"].tagline}</p>
          <p className="mt-1 text-sm text-subtle">{PRODUCT_META["e8-one"].consistencyNote}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACCOUNT_SIZES.map((size) => {
            const o = OFFERINGS.find((x) => x.size === size)!;
            const g = guardrailsFor(o);
            return (
              <article key={o.size} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-xl tracking-tight">{fmtSize(o.size)}</div>
                    <div className="text-[11px] uppercase tracking-wider text-subtle">{o.productLabel} · Perp</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-subtle line-through">{fmtMoney(o.priceOriginal, { compact: true })}</div>
                    <div className="font-mono text-lg text-primary">{fmtMoney(o.priceSale, { compact: true })}</div>
                  </div>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Line k="Profit target" v={`${o.profitTargetPct}% · ${fmtMoney(g.profitTarget, { compact: true })}`} />
                  <Line k="Dynamic DD" v={`${o.drawdownPct}% · ${fmtMoney(g.drawdown, { compact: true })}`} />
                  <Line k="Daily DD" v={`${o.dailyDrawdownPct}% · ${fmtMoney(g.dailyDrawdown, { compact: true })}`} />
                  <Line k="Consistency" v={`${o.officialConsistencyPct}% best day`} />
                  <Line k="Payout" v={`${o.payoutPct}%`} />
                  <Line k="First payout" v={`${o.firstPayoutDays} days`} />
                  <Line k="Pass" v={o.passMinDays ? `${o.passMinDays} day` : "—"} />
                  <Line k="Activation" v={o.activationFee ? "Yes" : "None"} />
                  <Line k="Min payout" v={fmtMoney(g.minPayout, { compact: true })} />
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-subtle">
        Default configurator: drawdown 6% max, payout 80%. Challenge profit targets are closed-profit. Performance
        has no profit target. Payout eligibility is the 40% best-day rule plus net profit above 50% of daily
        drawdown. Leftover buffer after a payout is excluded from the next cycle.
      </p>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-wider text-subtle">{k}</dt>
      <dd className="font-mono text-xs tabular-nums text-fg">{v}</dd>
    </div>
  );
}
