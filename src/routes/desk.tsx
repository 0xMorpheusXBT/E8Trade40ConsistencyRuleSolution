import { createFileRoute } from "@tanstack/react-router";
import { AccountBar, Shell } from "@/components/desk/shell";
import { ConsistencyGauge } from "@/components/desk/gauge";
import { LiveTradePanel } from "@/components/desk/live-trade";
import { DayLog, TradeLog } from "@/components/desk/ledgers";
import { CoachPanel } from "@/components/desk/coach-panel";
import { ImportStrip } from "@/components/desk/import-strip";
import { Badge } from "@/components/ui/badge";
import { evaluateConsistency, isoToday } from "@/lib/e8/engine/consistency";
import { getOffering, PRODUCT_META } from "@/lib/e8/markets/catalog";
import { asDayPnls, useDesk, useDeskHydrated } from "@/lib/e8/state/store";
import { fmtSize } from "@/lib/e8/format";

export const Route = createFileRoute("/desk")({ component: DeskPage });

function DeskPage() {
  const hydrated = useDeskHydrated();
  const product = useDesk((s) => s.product);
  const size = useDesk((s) => s.size);
  const stage = useDesk((s) => s.stage);
  const consistencyPct = useDesk((s) => s.consistencyPct);
  const days = useDesk((s) => s.days);
  const live = useDesk((s) => s.live);
  const offering = getOffering(product, size);

  const snap = evaluateConsistency({
    ratio: consistencyPct / 100,
    days: asDayPnls(days),
    todayDate: isoToday(),
    liveOpenPnl: live?.openPnl ?? 0,
  });

  const tone =
    snap.closeNow || snap.alert === "breach"
      ? "breach"
      : snap.alert === "danger"
        ? "danger"
        : snap.alert === "watch" || snap.alert === "first-day"
          ? "watch"
          : snap.alert === "ok"
            ? "ok"
            : "neutral";

  const statusLabel =
    stage === "challenge"
      ? "Challenge — official rule off, desk still tracks"
      : snap.closeNow
        ? "Red alert — flatten"
        : snap.alert === "ok"
          ? "Eligible on consistency"
          : snap.alert === "first-day"
            ? "Day 1 of cycle"
            : snap.alert === "breach"
              ? "Would breach 40%"
              : "Dilute to payout";

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
              <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
                {PRODUCT_META[product].label} · {fmtSize(size)}
              </h1>
              <Badge tone={tone}>{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {offering.tagline}. {stage === "performance" ? "Performance stage." : "Challenge stage."} Live
              cut-now desk — flatten before the open print becomes the cycle's best day.
            </p>
          </div>
        </div>

        <AccountBar />
        <ImportStrip />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Best day vs cycle profit</h2>
              <span className="font-mono text-xs text-subtle">cap {consistencyPct}%</span>
            </div>
            <ConsistencyGauge snap={snap} />
          </section>
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <LiveTradePanel snap={snap} />
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <DayLog />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <TradeLog />
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <CoachPanel snap={snap} />
        </section>
      </div>
    </Shell>
  );
}
