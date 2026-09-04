import { useMemo, useState } from "react";
import { SymbolPicker } from "@/components/desk/symbol-picker";
import { Badge } from "@/components/ui/badge";
import {
  instrumentFromTape,
  planAttack,
  remainingForStage,
  type AttackFit,
  type AttackRow,
  type Persona,
} from "@/lib/e8/attack";
import { fmtMoney, fmtPct, clsPnL } from "@/lib/e8/format";
import { HIP3_INSTRUMENTS, getInstrumentBySymbol, type Instrument } from "@/lib/e8/instruments";
import { useTape } from "@/lib/e8/use-tape";
import { cn } from "@/lib/utils";

const PERSONAS: { id: Persona; label: string; blurb: string }[] = [
  { id: "sprint", label: "Full-port sprint", blurb: "Pass the eval or dump the print. Tight SL. One or two 4h expansions." },
  { id: "measured", label: "Measured", blurb: "Partial margin. How many winners, what R, stay under 40%." },
  { id: "vol", label: "Vol hunter", blurb: "What’s expanding. Implied vol, 4h volume, 24h move — pick the highest-probability tape." },
];

export function PlanOfAttack({
  stage,
  size,
  equity,
  profitTarget,
  cycleProfit,
  effectiveTarget,
  maxPrint,
  dailyDrawdown,
  winRate,
  rewardRisk,
}: {
  stage: "challenge" | "performance";
  size: number;
  equity: number;
  profitTarget: number;
  cycleProfit: number;
  effectiveTarget: number;
  maxPrint: number | null;
  dailyDrawdown: number;
  winRate: number;
  rewardRisk: number;
}) {
  const [persona, setPersona] = useState<Persona>(stage === "challenge" ? "sprint" : "measured");
  const [marginPct, setMarginPct] = useState(persona === "sprint" ? 100 : 25);
  const [extra, setExtra] = useState<Instrument[]>([]);
  const extraCoins = extra.map((i) => i.hl);
  const { snap, loading } = useTape(extraCoins);

  const remaining = remainingForStage({ stage, profitTarget, cycleProfit, effectiveTarget });
  const marginUse = (persona === "sprint" ? 100 : marginPct) / 100;
  const universe = useMemo(() => {
    const seen = new Set<string>();
    const list: Instrument[] = [];
    for (const i of [...HIP3_INSTRUMENTS, ...extra]) {
      if (seen.has(i.hl)) continue;
      seen.add(i.hl);
      const tape = snap.markets[i.symbol];
      list.push(tape ? { ...i, mark: tape.mark } : i);
    }
    return list;
  }, [extra, snap]);

  const plan = planAttack(
    {
      stage,
      size,
      equity: equity || size,
      remaining,
      maxPrint: stage === "challenge" ? null : maxPrint,
      dailyDrawdown,
      winRate,
      rewardRisk,
      marginUse,
      persona,
    },
    universe,
    snap,
  );

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Analytical tools</p>
          <h2 className="mt-1 text-lg font-medium tracking-tight">Plan of attack</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{plan.goal}</p>
        </div>
        <Badge tone={snap.source === "live" ? "ok" : "watch"}>{loading ? "Pulling tape…" : snap.source === "live" ? "Live HL + XYZ" : "Demo tape"}</Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPersona(p.id);
              if (p.id === "sprint") setMarginPct(100);
              if (p.id === "measured" && marginPct === 100) setMarginPct(25);
              if (p.id === "vol" && marginPct === 100) setMarginPct(40);
            }}
            className={cn(
              "rounded-lg border px-3 py-3 text-left",
              persona === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
            )}
          >
            <div className={cn("text-sm font-medium", persona === p.id ? "text-primary" : "text-fg")}>{p.label}</div>
            <p className="mt-1 text-xs text-muted">{p.blurb}</p>
          </button>
        ))}
      </div>

      {persona !== "sprint" ? (
        <label className="mt-4 flex items-center gap-3 text-sm text-muted">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Margin used</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={marginPct}
            onChange={(e) => setMarginPct(Number(e.target.value))}
            className="h-1.5 flex-1 accent-primary"
          />
          <span className="w-12 font-mono tabular-nums text-fg">{marginPct}%</span>
        </label>
      ) : null}

      {plan.pick ? <PickCard row={plan.pick} remaining={remaining} stage={stage} /> : null}

      <div className="mt-4 max-w-md">
        <p className="mb-1 text-[11px] uppercase tracking-wider text-subtle">Add any Hyperliquid or Trade.XYZ market</p>
        <SymbolPicker
          value=""
          onChange={(_symbol, asset) => {
            const lev = Math.min(15, asset.maxLeverage || 15);
            const inst = instrumentFromTape(
              asset.symbol,
              asset.hl,
              asset.dex === "xyz" ? "Trade.XYZ" : asset.venue,
              asset.assetClass === "equity" ? "index" : (asset.assetClass as Instrument["assetClass"]),
              asset.symbol === "COPPER" ? 8 : lev,
              getInstrumentBySymbol(asset.symbol)?.mark ?? 0,
            );
            setExtra((prev) => (prev.some((p) => p.hl === inst.hl) ? prev : [...prev, inst]));
          }}
        />
      </div>

      <div className="mt-4 overflow-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-subtle">
            <tr>
              <th className="py-2 pr-3 font-medium">Market</th>
              <th className="py-2 pr-3 font-medium">IV</th>
              <th className="py-2 pr-3 font-medium">4h exp</th>
              <th className="py-2 pr-3 font-medium">24h</th>
              <th className="py-2 pr-3 font-medium">4h vol</th>
              <th className="py-2 pr-3 font-medium">Move to goal</th>
              <th className="py-2 pr-3 font-medium">SL</th>
              <th className="py-2 pr-3 font-medium">Wins</th>
              <th className="py-2 font-medium">P(hit)</th>
            </tr>
          </thead>
          <tbody>
            {plan.rows.map((r) => (
              <tr key={r.hl} className="border-t border-border/80">
                <td className="py-2 pr-3">
                  <div className="font-mono">{r.symbol}</div>
                  <div className="text-[11px] uppercase tracking-wider text-subtle">
                    {r.leverage}x · {r.venue}
                  </div>
                </td>
                <td className="py-2 pr-3 font-mono">{fmtPct(r.ivAnn * 100, 0)}</td>
                <td className="py-2 pr-3 font-mono">{fmtPct(r.range4h * 100, 2)}</td>
                <td className={cn("py-2 pr-3 font-mono", clsPnL(r.dayPct))}>{fmtPct(r.dayPct * 100, 2)}</td>
                <td className="py-2 pr-3 font-mono text-muted">{fmtMoney(r.vol4h, { compact: true })}</td>
                <td className="py-2 pr-3 font-mono">
                  {fmtPct(r.movePct * 100, 2)}
                  <div className="text-[11px] text-subtle">{fmtMoney(r.movePx)}</div>
                </td>
                <td className="py-2 pr-3 font-mono">
                  {fmtPct(r.slPct * 100, 3)}
                  <div className="text-[11px] text-subtle">{fmtMoney(r.slPx)}</div>
                </td>
                <td className="py-2 pr-3 font-mono">{r.winningTrades || "—"}</td>
                <td className="py-2">
                  <FitPill fit={r.fit} p={r.probability} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PickCard({ row, remaining, stage }: { row: AttackRow; remaining: number; stage: "challenge" | "performance" }) {
  return (
    <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-subtle">Highest-probability path</p>
          <h3 className="mt-0.5 font-mono text-xl">
            {row.symbol} · {row.leverage}x
          </h3>
        </div>
        <FitPill fit={row.fit} p={row.probability} />
      </div>
      <p className="mt-2 text-sm text-muted">{row.why}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k={stage === "challenge" ? "Still to pass" : "Still to print"} v={fmtMoney(remaining)} />
        <Mini k="Notional" v={fmtMoney(row.notional, { compact: true })} hint={`${Math.round(row.marginUse * 100)}% margin`} />
        <Mini k="Stop" v={fmtMoney(row.slPx)} hint={`${fmtPct(row.slPct * 100, 3)} · daily DD is 1R`} />
        <Mini k="4h expansion $" v={fmtMoney(row.dollarsPer4h)} hint={`${fmtPct(row.range4h * 100, 2)} of price`} />
      </div>
    </div>
  );
}

function Mini({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-subtle">{k}</div>
      <div className="font-mono text-sm text-fg">{v}</div>
      {hint ? <div className="text-[11px] text-subtle">{hint}</div> : null}
    </div>
  );
}

function FitPill({ fit, p }: { fit: AttackFit; p: number }) {
  const tone: Record<AttackFit, "ok" | "watch" | "danger" | "breach"> = {
    "one-print": "ok",
    "few-prints": "watch",
    grind: "watch",
    "too-thin": "danger",
    "locks-40": "breach",
  };
  const label: Record<AttackFit, string> = {
    "one-print": "One print",
    "few-prints": "Few prints",
    grind: "Grind",
    "too-thin": "Thin",
    "locks-40": "Locks 40%",
  };
  return (
    <span className="inline-flex items-center gap-2">
      <Badge tone={tone[fit]}>{label[fit]}</Badge>
      <span className="font-mono text-xs text-fg">{Math.round(p * 100)}%</span>
    </span>
  );
}
