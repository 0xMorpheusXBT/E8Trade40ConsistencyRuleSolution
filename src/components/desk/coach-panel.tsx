import { coach, computeStats, type CoachCard } from "@/lib/e8/analytics";
import type { ConsistencySnapshot } from "@/lib/e8/consistency";
import { getOffering, guardrailsFor } from "@/lib/e8/catalog";
import { fmtMoney, fmtPct, fmtRatio } from "@/lib/e8/format";
import { useDesk } from "@/lib/e8/store";
import { cn } from "@/lib/utils";

export function CoachPanel({ snap }: { snap: ConsistencySnapshot }) {
  const product = useDesk((s) => s.product);
  const size = useDesk((s) => s.size);
  const trades = useDesk((s) => s.trades);
  const live = useDesk((s) => s.live);
  const currentEquity = useDesk((s) => s.currentEquity);
  const offering = getOffering(product, size);
  const rails = guardrailsFor(offering, currentEquity);
  const stats = computeStats(trades);
  const cards = coach({
    snap,
    stats,
    guardrails: rails,
    accountSize: size,
    liveOpenPnl: live?.openPnl ?? 0,
    liveSymbol: live?.symbol ?? null,
  });

  return (
    <section className="flex h-full flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-fg">Strategy desk</h2>
        <span className="text-[11px] uppercase tracking-wider text-subtle">from your tape + 40% rule</span>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini k="Win rate" v={stats.winRate == null ? "—" : fmtPct(stats.winRate * 100, 0)} />
        <Mini k="Avg win" v={stats.avgWin == null ? "—" : fmtMoney(stats.avgWin)} />
        <Mini k="Avg loss" v={stats.avgLoss == null ? "—" : fmtMoney(-stats.avgLoss)} />
        <Mini k="Payoff / R" v={stats.payoff == null ? "—" : fmtRatio(stats.payoff)} />
      </div>

      <ul className="flex flex-col gap-2">
        {cards.map((c) => (
          <li key={c.title}>
            <CoachRow card={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{k}</div>
      <div className="font-mono text-sm tabular-nums text-fg">{v}</div>
    </div>
  );
}

function CoachRow({ card }: { card: CoachCard }) {
  return (
    <article
      className={cn(
        "rounded-lg border px-3 py-2.5",
        card.tone === "breach" && "border-danger/40 bg-danger/10",
        card.tone === "danger" && "border-danger/30 bg-danger/5",
        card.tone === "watch" && "border-warn/30 bg-warn/5",
        card.tone === "ok" && "border-ok/30 bg-ok/5",
        card.tone === "info" && "border-border bg-bg-elevated",
      )}
    >
      <h3
        className={cn(
          "text-sm font-medium",
          card.tone === "breach" && "text-danger",
          card.tone === "danger" && "text-danger",
          card.tone === "watch" && "text-warn",
          card.tone === "ok" && "text-ok",
          card.tone === "info" && "text-fg",
        )}
      >
        {card.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{card.body}</p>
    </article>
  );
}
