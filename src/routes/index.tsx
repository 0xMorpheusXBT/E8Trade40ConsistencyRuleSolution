import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountBar, Shell } from "@/components/desk/shell";
import { BookStrip, PathBoard, PlanKpis, PlannerHero } from "@/components/desk/planner";
import { FullPortPanel } from "@/components/desk/full-port";
import { PlanOfAttack } from "@/components/desk/plan-of-attack";
import { ConsistencyGauge } from "@/components/desk/gauge";
import { DayLog } from "@/components/desk/ledgers";
import { Badge } from "@/components/ui/badge";
import { evaluateConsistency, isoToday } from "@/lib/e8/engine/consistency";
import { getOffering, guardrailsFor, PRODUCT_META } from "@/lib/e8/markets/catalog";
import { getInstrument } from "@/lib/e8/markets/instruments";
import { planCycle } from "@/lib/e8/engine/plan";
import { sizeFullPort } from "@/lib/e8/engine/port";
import { asDayPnls, useDesk, useDeskHydrated } from "@/lib/e8/state/store";
import { fmtSize } from "@/lib/e8/format";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useDeskHydrated();
  const product = useDesk((s) => s.product);
  const size = useDesk((s) => s.size);
  const stage = useDesk((s) => s.stage);
  const consistencyPct = useDesk((s) => s.consistencyPct);
  const days = useDesk((s) => s.days);
  const live = useDesk((s) => s.live);
  const currentEquity = useDesk((s) => s.currentEquity);
  const targetProfit = useDesk((s) => s.targetProfit);
  const winRatePct = useDesk((s) => s.winRatePct);
  const rewardRisk = useDesk((s) => s.rewardRisk);
  const tradesPerDay = useDesk((s) => s.tradesPerDay);
  const instrumentId = useDesk((s) => s.instrumentId);
  const leverageOverride = useDesk((s) => s.leverageOverride);
  const markOverride = useDesk((s) => s.markOverride);

  const offering = getOffering(product, size);
  const guardrails = guardrailsFor(offering, currentEquity);
  const inst = getInstrument(instrumentId);

  const snap = evaluateConsistency({
    ratio: consistencyPct / 100,
    days: asDayPnls(days),
    todayDate: isoToday(),
    liveOpenPnl: live?.openPnl ?? 0,
  });

  const plan = planCycle({
    accountSize: size,
    targetProfit,
    ratio: consistencyPct / 100,
    winRate: winRatePct / 100,
    rewardRisk,
    tradesPerDay,
    dailyDrawdown: guardrails.dailyDrawdown,
    dailyProfitCap: guardrails.dailyProfitCap,
    budgetCap: guardrails.budgetCap,
    maxDrawdown: guardrails.drawdown,
    minPayout: guardrails.minPayout,
    payoutPct: offering.payoutPct,
    cycleProfit: snap.cycleProfit,
    bestDay: snap.bestDay,
    todayBooked: snap.todayBooked,
  });

  const port = sizeFullPort({
    equity: currentEquity || size,
    leverage: leverageOverride ?? inst.leverage,
    price: markOverride ?? inst.mark,
    dailyDrawdown: guardrails.dailyDrawdown,
    budgetCap: guardrails.budgetCap,
    riskDollars: plan.suggestedRisk,
    rewardRisk,
    maxBestDay: plan.maxBestDay,
    todayHeadroom: snap.todayHeadroom,
    targetProfit: plan.effectiveTarget,
    venueMaxNotional: inst.maxNotional,
  });

  if (!hydrated) {
    return (
      <Shell>
        <div className="h-[70vh] rounded-xl border border-border bg-surface" />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">40% Consistency Strategy</h1>
              <Badge tone={stage === "challenge" ? "watch" : plan.barRaised ? "danger" : "ok"}>
                {stage === "challenge" ? "Challenge — rule off" : PRODUCT_META[product].label + " · " + fmtSize(size)}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              You passed. Type the money you want from this funded book. The desk returns risk per trade, dollars
              per winner, how many prints remain, and whether a full-port {inst.leverage}x ticket would lock the
              40% rule.
            </p>
          </div>
          <Link to="/desk" className="text-sm text-muted hover:text-fg">
            Open live cut-now desk
          </Link>
        </div>

        <AccountBar />
        <PlannerHero plan={plan} size={size} />
        <PlanKpis plan={plan} />
        <PathBoard plan={plan} />
        <FullPortPanel port={port} dailyDrawdown={guardrails.dailyDrawdown} />
        <PlanOfAttack
          stage={stage}
          size={size}
          equity={currentEquity || size}
          profitTarget={guardrails.profitTarget}
          cycleProfit={snap.cycleProfit}
          effectiveTarget={plan.effectiveTarget}
          maxPrint={stage === "challenge" ? null : plan.maxBestDay}
          dailyDrawdown={guardrails.dailyDrawdown}
          winRate={winRatePct / 100}
          rewardRisk={rewardRisk}
        />
        <BookStrip plan={plan} suggestedWin={plan.suggestedWin} suggestedRisk={plan.suggestedRisk} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Live share vs {consistencyPct}%</h2>
              <span className="font-mono text-xs text-subtle">updates on every book</span>
            </div>
            <ConsistencyGauge snap={snap} />
          </section>
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <DayLog />
          </div>
        </div>
      </div>
    </Shell>
  );
}
