import { SCRAPE } from "@/lib/e8/markets/catalog";

const EXAMPLES = {
  pass: [
    { day: 1, pnl: 500 },
    { day: 2, pnl: 550 },
    { day: 3, pnl: -150 },
    { day: 4, pnl: 600, best: true },
    { day: 5, pnl: 400 },
  ],
  fail: [
    { day: 1, pnl: 1100 },
    { day: 2, pnl: 1500, best: true },
    { day: 3, pnl: 900 },
    { day: 4, pnl: -400 },
  ],
};

export function RuleGuide() {
  const passTotal = EXAMPLES.pass.reduce((a, d) => a + d.pnl, 0);
  const failTotal = EXAMPLES.fail.reduce((a, d) => a + d.pnl, 0);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Help article 10450125</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance">40% Best Day Rule</h1>
        <p className="mt-3 text-muted text-pretty">
          No single trading day may exceed 40% of total generated profits in the current payout cycle. Official on
          E8 One and E8 One Crypto in the Performance stage. Exceeding it does not lose the account — you keep
          trading until the best day is diluted.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium">Formula</h2>
        <p className="mt-2 font-mono text-lg text-primary">Total profit ≥ Best day ÷ 0.40</p>
        <p className="mt-2 text-sm text-muted">
          Equivalently, best day ≤ 40% of cycle profit. Remaining to fulfill = best day ÷ 0.40 − cycle profit.
          After a payout, Current Best Day and Current Performance reset. Profit left in the account from the
          previous cycle is a buffer and is not counted.
        </p>
        <p className="mt-3 text-sm text-muted">
          Max you can book today without creating a new best day above 40%:{" "}
          <span className="font-mono text-fg">(0.40 / 0.60) × profit from other days</span> — two-thirds of
          everything already banked on other sessions.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ExampleCard
          title="Payout is possible"
          rows={EXAMPLES.pass}
          total={passTotal}
          cap={passTotal * 0.4}
          best={600}
          ok
        />
        <ExampleCard
          title="Payout is not possible"
          rows={EXAMPLES.fail}
          total={failTotal}
          cap={failTotal * 0.4}
          best={1500}
          ok={false}
          note="Keep trading until total profit reaches $3,750 ($1,500 ÷ 0.40)."
        />
      </div>

      <section>
        <h2 className="text-lg font-medium">Why it makes you a better trader</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>It kills the one-hit-wonder. Three similar days beat one lottery ticket plus noise.</li>
          <li>It forces size to respect the book you already have, not the size you wish you had.</li>
          <li>It maps directly onto payout eligibility — the same discipline that gets you paid.</li>
          <li>Ideal path from the help center: make a similar amount three days in a row, then request.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium">The “scam” attack vector</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The 40% rule does not fail the account and does not confiscate profit. It delays a payout until the book
          is not a lottery ticket. The attack writes itself when a trader full-ports 15x, prints 100% of the cycle
          in one session, then cannot request — and the terminal never showed the dollar ceiling while the trade
          was open. Opacity is the vector. This desk closes it: risk per trade, dollars per winner, remaining
          prints, and a hard “do not full-port this target” when a 2R would lock the cycle.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium">Prohibited bypasses</h2>
        <p className="mt-2 text-sm text-muted">
          Intentionally splitting a large winning position through hedging or partial closures may have all
          profit from that position consolidated into a single day.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Partial closes of one winner across multiple days, especially on a one-day market move.</li>
          <li>Several positions in the same instrument opened one day and closed across days.</li>
          <li>Immediate open / close / re-open of the same exposure held across days.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Payout criteria (E8 One Performance)</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>40% Best Day Rule holds on the current cycle.</li>
          <li>Net profit requested is greater than 50% of daily drawdown (e.g. $2,001 on a $100K with 4% daily DD).</li>
          <li>Leave a buffer when needed so dynamic drawdown does not tag the floor after the payout.</li>
        </ol>
      </section>

      <p className="text-xs text-subtle">
        Canonical write-up: {SCRAPE.help}. Challenge stage has no consistency rule. This desk still tracks it so a
        trader never walks into Performance with a one-hit habit.
      </p>
    </article>
  );
}

function ExampleCard({
  title,
  rows,
  total,
  cap,
  best,
  ok,
  note,
}: {
  title: string;
  rows: { day: number; pnl: number; best?: boolean }[];
  total: number;
  cap: number;
  best: number;
  ok: boolean;
  note?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="border-t border-border/80">
              <td className="py-1.5 text-muted">Day {r.day}</td>
              <td className={`py-1.5 text-right font-mono tabular-nums ${r.pnl >= 0 ? "text-ok" : "text-danger"}`}>
                {r.pnl >= 0 ? "+" : "-"}${Math.abs(r.pnl).toLocaleString()}
                {r.best ? " · best" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-subtle">Total</dt>
          <dd className="font-mono">${total.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-subtle">40% of total</dt>
          <dd className="font-mono">${cap.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-subtle">Best day</dt>
          <dd className={`font-mono ${ok ? "text-ok" : "text-danger"}`}>
            ${best.toLocaleString()} · {ok ? "eligible" : "ineligible"}
          </dd>
        </div>
      </dl>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
