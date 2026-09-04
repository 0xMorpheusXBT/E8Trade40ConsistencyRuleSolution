import { INSTRUMENTS, getInstrument } from "@/lib/e8/instruments";
import type { PortResult } from "@/lib/e8/port";
import { fmtMoney, fmtPct } from "@/lib/e8/format";
import { useDesk } from "@/lib/e8/store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FullPortPanel({ port, dailyDrawdown }: { port: PortResult; dailyDrawdown: number }) {
  const instrumentId = useDesk((s) => s.instrumentId);
  const setInstrumentId = useDesk((s) => s.setInstrumentId);
  const leverageOverride = useDesk((s) => s.leverageOverride);
  const setLeverageOverride = useDesk((s) => s.setLeverageOverride);
  const markOverride = useDesk((s) => s.markOverride);
  const setMarkOverride = useDesk((s) => s.setMarkOverride);
  const inst = getInstrument(instrumentId);
  const lev = leverageOverride ?? inst.leverage;
  const mark = markOverride ?? inst.mark;

  const tone =
    port.realistic === "do-not-full-port" ? "danger" : port.realistic === "size-down" ? "warn" : "ok";

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Full-port · tight stop · daily DD</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{inst.note}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
            tone === "danger" && "bg-danger/15 text-danger",
            tone === "warn" && "bg-warn/15 text-warn",
            tone === "ok" && "bg-ok/15 text-ok",
          )}
        >
          {port.headline}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {INSTRUMENTS.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => setInstrumentId(i.id)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs",
              instrumentId === i.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:text-fg",
            )}
          >
            {i.label}
            <span className="ml-1.5 font-mono text-subtle">{i.leverage}x</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Leverage</span>
          <Input
            type="number"
            min={1}
            max={50}
            step={1}
            value={lev}
            onChange={(e) => setLeverageOverride(Number(e.target.value))}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Mark</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={mark}
            onChange={(e) => setMarkOverride(Number(e.target.value))}
          />
        </label>
        <Stat k="Max notional" v={fmtMoney(port.maxNotional, { compact: true })} />
        <Stat k="Daily DD" v={fmtMoney(dailyDrawdown)} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{port.body}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          k="SL vs daily DD"
          v={`${fmtPct(port.slPctVsDailyDd * 100, 3)}`}
          hint={`$${port.slDistanceVsDailyDd.toFixed(2)} of price`}
        />
        <Stat
          k="SL at planned risk"
          v={`${fmtPct(port.slPctVsRisk * 100, 3)}`}
          hint={`$${port.slDistanceVsRisk.toFixed(2)} of price`}
        />
        <Stat
          k="Full-port 2R"
          v={fmtMoney(port.fullPortWin)}
          hint={port.fullPortLocksCycle ? "Locks the cycle" : "Under the 40% cap"}
          tone={port.fullPortLocksCycle ? "danger" : "ok"}
        />
        <Stat
          k="Tradable book"
          v={fmtMoney(port.tradableNotional, { compact: true })}
          hint={`${port.tradableLeverage.toFixed(2)}x · ${fmtPct(port.tradableSlPct * 100, 2)} SL`}
        />
      </div>
    </section>
  );
}

function Stat({
  k,
  v,
  hint,
  tone,
}: {
  k: string;
  v: string;
  hint?: string;
  tone?: "ok" | "danger";
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{k}</div>
      <div
        className={cn(
          "font-mono text-sm font-medium tabular-nums text-fg",
          tone === "ok" && "text-ok",
          tone === "danger" && "text-danger",
        )}
      >
        {v}
      </div>
      {hint ? <div className="text-[11px] text-subtle">{hint}</div> : null}
    </div>
  );
}
