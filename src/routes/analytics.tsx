import { createFileRoute } from "@tanstack/react-router";
import { AccountBar, Shell } from "@/components/desk/shell";
import { PlanOfAttack } from "@/components/desk/plan-of-attack";
import { Badge } from "@/components/ui/badge";
import { evaluateConsistency, isoToday } from "@/lib/e8/consistency";
import { getOffering, guardrailsFor } from "@/lib/e8/catalog";
import { planCycle } from "@/lib/e8/plan";
import { asDayPnls, useDesk, useDeskHydrated } from "@/lib/e8/store";
import { fmtSize } from "@/lib/e8/format";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
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

  const offering = getOffering(product, size);
  const guardrails = guardrailsFor(offering, currentEquity);
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
    tradesPerDay: 2,
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
        <header className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">E8 Terminal · Analytical tools</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-medium tracking-tight">Plan of attack</h1>
            <Badge tone={stage === "challenge" ? "watch" : "ok"}>
              {stage === "challenge" ? "Eval" : "Funded"} · {fmtSize(size)}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted">
            Three desks, one remaining number. Full-porters who want to pass now. Measured traders who want a
            winner count and an R that stays under 40%. Vol hunters who want the HIP-3 / Trade.XYZ market whose
            4h expansion, 4h volume and 24h range make the next print the most probable.
          </p>
        </header>

        <AccountBar />

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
      </div>
    </Shell>
  );
}
