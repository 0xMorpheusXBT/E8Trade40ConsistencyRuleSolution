import type { CyclePlan } from "@/lib/e8/engine/plan";
import { plannedDays } from "@/lib/e8/engine/plan";
import { fmtMoney, fmtPct } from "@/lib/e8/format";
import { useDesk } from "@/lib/e8/state/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TARGET_PRESETS = [0.02, 0.04, 0.08, 0.1, 0.15] as const;

export function PlannerHero({ plan, size }: { plan: CyclePlan; size: number }) {
  const targetProfit = useDesk((s) => s.targetProfit);
  const setTargetProfit = useDesk((s) => s.setTargetProfit);
  const winRatePct = useDesk((s) => s.winRatePct);
  const setWinRatePct = useDesk((s) => s.setWinRatePct);
  const rewardRisk = useDesk((s) => s.rewardRisk);
  const setRewardRisk = useDesk((s) => s.setRewardRisk);
  const tradesPerDay = useDesk((s) => s.tradesPerDay);
  const setTradesPerDay = useDesk((s) => s.setTradesPerDay);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <p className="text-[11px] uppercase tracking-wider text-subtle">Passed · Performance · I want to make</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Target profit this cycle</span>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3">
            <span className="font-mono text-xl text-muted">$</span>
            <input
              className="h-14 w-full bg-transparent font-mono text-3xl font-medium tabular-nums tracking-tight text-fg outline-none sm:text-4xl"
              type="number"
              min={0}
              step={100}
              value={Number.isFinite(targetProfit) ? targetProfit : 0}
              onChange={(e) => setTargetProfit(Number(e.target.value))}
            />
          </div>
        </label>
        <p className="pb-2 text-sm text-muted">
          from this {fmtMoney(size, { compact: true })} book
          <span className="block text-[11px] uppercase tracking-wider text-subtle">
            take-home {fmtMoney(plan.takeHome, { compact: true })} at 80% payout
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TARGET_PRESETS.map((p) => {
          const v = Math.round(size * p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => setTargetProfit(v)}
              className={cn(
                "rounded-full border px-3 py-2 font-mono text-xs tabular-nums",
                targetProfit === v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted hover:text-fg",
              )}
            >
              {fmtPct(p * 100, 0)} · {fmtMoney(v, { compact: true })}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Knob
          label="Win rate"
          value={`${winRatePct}%`}
          min={20}
          max={80}
          step={5}
          raw={winRatePct}
          onChange={setWinRatePct}
        />
        <Knob
          label="Reward / risk"
          value={`${rewardRisk.toFixed(1)}R`}
          min={1}
          max={4}
          step={0.5}
          raw={rewardRisk}
          onChange={setRewardRisk}
        />
        <Knob
          label="Trades / day"
          value={String(tradesPerDay)}
          min={1}
          max={6}
          step={1}
          raw={tradesPerDay}
          onChange={setTradesPerDay}
        />
      </div>
    </section>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  step,
  raw,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  raw: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-wider text-subtle">
        {label}
        <span className="font-mono tabular-nums text-fg">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full accent-primary"
      />
    </label>
  );
}

export function PlanKpis({ plan }: { plan: CyclePlan }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        label="Risk / trade"
        value={fmtMoney(plan.suggestedRisk)}
        hint={`${fmtPct(plan.riskPctOfSize)} of size · ${fmtPct(plan.riskPctOfDailyDd, 0)} of daily DD`}
      />
      <Kpi
        label="Make / trade"
        value={fmtMoney(plan.suggestedWin)}
        hint={`${plan.rewardRisk.toFixed(1)}R · cap next ${fmtMoney(plan.maxNextWin)}`}
        tone="ok"
      />
      <Kpi
        label="Trades to target"
        value={plan.remainingExpectedTrades > 0 ? String(plan.remainingExpectedTrades) : String(plan.expectedTradesToTarget)}
        hint={`${plan.remainingWinningTrades || plan.winningTradesToTarget} winners · ${plan.winRate * 100}% WR`}
      />
      <Kpi
        label="Max best day"
        value={fmtMoney(plan.maxBestDay)}
        hint={`${Math.round(plan.ratio * 100)}% of ${fmtMoney(plan.effectiveTarget)}`}
        tone={plan.barRaised ? "warn" : undefined}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </div>
  );
}

export function PathBoard({ plan }: { plan: CyclePlan }) {
  const days = plannedDays(plan, plan.minEqualDays);
  const remaining = plan.remainingExpectedTrades;
  const sessions = plan.remainingSessions || plan.expectedSessions;

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Most realistic path</h2>
          <p className="mt-1 text-sm text-muted">{plan.pathTitle}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm tabular-nums text-fg">
            {remaining} trades · {sessions} sessions
          </div>
          <div className="text-[11px] uppercase tracking-wider text-subtle">still to print</div>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{plan.pathBody}</p>

      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {days.map((d) => (
          <li key={d.day} className="rounded-lg bg-surface-2 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wider text-subtle">Day {d.day}</div>
            <div className="font-mono text-lg tabular-nums text-fg">{fmtMoney(d.profit)}</div>
            <div className="text-xs text-muted">{fmtPct(d.share * 100)} of target</div>
          </li>
        ))}
      </ol>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Row k="Expectancy / trade" v={fmtMoney(plan.expectancy, { signed: true })} />
        <Row k="Losses to daily DD" v={`${plan.consecutiveLossesToDaily} in a row`} />
        <Row k="Min equal days" v={String(plan.minEqualDays)} />
        <Row k="Raised bar" v={plan.barRaised ? fmtMoney(plan.effectiveTarget) : "No"} />
      </dl>

      {plan.warnings.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {plan.warnings.map((w) => (
            <li key={w} className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
              {w}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-subtle">{k}</dt>
      <dd className="font-mono text-sm tabular-nums text-fg">{v}</dd>
    </div>
  );
}

export function BookStrip({
  plan,
  suggestedWin,
  suggestedRisk,
}: {
  plan: CyclePlan;
  suggestedWin: number;
  suggestedRisk: number;
}) {
  const bookResult = useDesk((s) => s.bookResult);
  const instrumentId = useDesk((s) => s.instrumentId);

  const chips = [
    { label: `+${fmtMoney(suggestedWin, { compact: true })} win`, pnl: Math.round(suggestedWin) },
    { label: `+${fmtMoney(suggestedWin / 2, { compact: true })} half`, pnl: Math.round(suggestedWin / 2) },
    { label: `−${fmtMoney(suggestedRisk, { compact: true })} loss`, pnl: -Math.round(suggestedRisk) },
    { label: `−${fmtMoney(suggestedRisk * 2, { compact: true })} 2R loss`, pnl: -Math.round(suggestedRisk * 2) },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Book a result — the % moves</h2>
          <p className="mt-1 text-sm text-muted">
            Every closed P&L restates best-day share, remaining trades, and whether the bar just moved.
          </p>
        </div>
        <ShareChip plan={plan} />
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const n = Number(fd.get("pnl"));
          if (Number.isNaN(n) || n === 0) return;
          bookResult(n, { symbol: instrumentId.toUpperCase(), risk: suggestedRisk });
          e.currentTarget.reset();
        }}
      >
        <Input name="pnl" type="number" step="0.01" placeholder="Closed P&L, signed" className="sm:max-w-xs" required />
        <Button type="submit" className="h-10">
          Book
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => bookResult(c.pnl, { symbol: instrumentId.toUpperCase(), risk: suggestedRisk })}
            className={cn(
              "rounded-full border border-border px-3 py-2 font-mono text-xs tabular-nums hover:bg-surface-2",
              c.pnl >= 0 ? "text-ok" : "text-danger",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Row k="Remaining to target" v={fmtMoney(plan.remainingToTarget)} />
        <Row k="Trades left" v={String(plan.remainingExpectedTrades)} />
        <Row k="Winners left" v={String(plan.remainingWinningTrades)} />
        <Row k="Sessions left" v={String(plan.remainingSessions)} />
      </dl>
    </section>
  );
}

function ShareChip({ plan }: { plan: CyclePlan }) {
  const share = plan.shareOfCycle;
  const tone =
    share == null ? "text-muted" : share > plan.ratio ? "text-danger" : share > plan.ratio * 0.8 ? "text-warn" : "text-ok";
  return (
    <div className="text-right">
      <div className={cn("font-mono text-2xl font-medium tabular-nums", tone)}>
        {share == null ? "—" : fmtPct(share * 100)}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-subtle">best day of cycle</div>
    </div>
  );
}
