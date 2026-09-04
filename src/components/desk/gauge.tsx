import type { ConsistencySnapshot } from "@/lib/e8/consistency";
import { fmtMoney, fmtPct } from "@/lib/e8/format";
import { cn } from "@/lib/utils";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export function ConsistencyGauge({ snap }: { snap: ConsistencySnapshot }) {
  const share = snap.projectedShare ?? snap.bestDayShare ?? 0;
  const pct = Math.max(0, share * 100);
  const fillAngle = Math.min(360, (pct / 100) * 360);
  const capAngle = snap.ratio * 360;
  const tone =
    snap.alert === "breach" || snap.closeNow
      ? "danger"
      : snap.alert === "danger" || snap.alert === "watch"
        ? "warn"
        : snap.alert === "ok"
          ? "ok"
          : "muted";

  const strokeClass =
    tone === "danger" ? "stroke-danger" : tone === "warn" ? "stroke-warn" : "stroke-ok";

  const pctClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
        : tone === "ok"
          ? "text-ok"
          : "text-muted";

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative mx-auto size-44 shrink-0 sm:mx-0">
        <svg viewBox="0 0 120 120" className="size-full">
          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <path
            d={arc(60, 60, 48, 0, capAngle)}
            fill="none"
            stroke="var(--color-subtle)"
            strokeWidth="2"
            strokeDasharray="2 3"
          />
          {fillAngle > 0.5 && (
            <path
              d={arc(60, 60, 48, 0, fillAngle)}
              fill="none"
              className={strokeClass}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          <line
            x1="60"
            y1="12"
            x2={polar(60, 60, 54, capAngle).x}
            y2={polar(60, 60, 54, capAngle).y}
            stroke="var(--color-fg)"
            strokeWidth="1.5"
            opacity="0.55"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-mono text-3xl font-medium tabular-nums tracking-tight", pctClass)}>
            {fmtPct(pct, 1)}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-subtle">best day</span>
        </div>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Cycle profit" value={fmtMoney(snap.cycleProfit, { signed: true })} />
        <Stat label="Best day" value={fmtMoney(snap.bestDay, { signed: true })} hint={snap.bestDayDate ?? undefined} />
        <Stat label="Min total required" value={fmtMoney(snap.minTotalRequired)} hint={`best ÷ ${snap.ratio.toFixed(2)}`} />
        <Stat
          label="Still to dilute"
          value={fmtMoney(snap.remainingToFulfill)}
          tone={snap.remainingToFulfill > 0 ? "warn" : "ok"}
        />
        <Stat label="Today booked" value={fmtMoney(snap.todayBooked, { signed: true })} />
        <Stat
          label="Today + live"
          value={fmtMoney(snap.todayProjected, { signed: true })}
          tone={snap.closeNow ? "danger" : undefined}
        />
        <Stat
          label="Max allowed today"
          value={snap.maxAllowedToday == null ? "Day 1 · n/a" : fmtMoney(snap.maxAllowedToday)}
          hint="2/3 of other-day profit at 40%"
        />
        <Stat
          label="Today headroom"
          value={snap.liveHeadroom == null ? "—" : fmtMoney(snap.liveHeadroom, { signed: true })}
          tone={snap.liveHeadroom != null && snap.liveHeadroom < 0 ? "danger" : "ok"}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "danger";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
      <div
        className={cn(
          "truncate font-mono text-sm font-medium tabular-nums text-fg",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
      {hint ? <div className="truncate text-[11px] text-subtle">{hint}</div> : null}
    </div>
  );
}
