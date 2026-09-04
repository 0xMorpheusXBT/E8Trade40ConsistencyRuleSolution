import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/desk/shell";
import { SymbolPicker, VenueToggle } from "@/components/desk/symbol-picker";
import {
  HL_COUNT,
  HL_NATIVE_COUNT,
  XYZ_COUNT,
  HL_UNIVERSE,
  inVenue,
  type HlAssetClass,
  type VenueFilter,
} from "@/lib/e8/hl-universe";

const CLASSES: { id: HlAssetClass | "all"; label: string }[] = [
  { id: "all", label: "All classes" },
  { id: "crypto", label: "Crypto" },
  { id: "index", label: "Indices" },
  { id: "equity", label: "Equities" },
  { id: "metal", label: "Metals" },
  { id: "energy", label: "Energy" },
  { id: "fx", label: "FX" },
];

export const Route = createFileRoute("/markets")({ component: MarketsPage });

function MarketsPage() {
  const [venue, setVenue] = useState<VenueFilter>("all");
  const [klass, setKlass] = useState<HlAssetClass | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const k = q.trim().toUpperCase();
    return HL_UNIVERSE.filter((a) => {
      if (!inVenue(a, venue)) return false;
      if (klass !== "all" && a.assetClass !== klass) return false;
      if (!k) return true;
      return (
        a.symbol.toUpperCase().includes(k) ||
        a.hl.toUpperCase().includes(k) ||
        a.terminalSymbol.toUpperCase().includes(k) ||
        a.venue.toUpperCase().includes(k)
      );
    });
  }, [venue, klass, q]);

  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">E8 Terminal · Asset universe</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">HL perps + Trade.XYZ</h1>
        <p className="mt-3 text-sm text-muted">
          Official E8 book: {HL_NATIVE_COUNT} Hyperliquid perps (HL_PERP) and {XYZ_COUNT} HIP-3
          Trade.XYZ markets (HL_HIP3_XYZ). CEX FX/CFD and PARA HIP-3 are not on this desk. Sizing is
          USD notional.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <VenueToggle value={venue} onChange={setVenue} />
        <div className="flex flex-wrap gap-1">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setKlass(c.id)}
              className={
                klass === c.id
                  ? "rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs text-primary"
                  : "rounded-full border border-border px-3 py-1.5 text-xs text-subtle hover:text-fg"
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="max-w-md">
          <SymbolPicker value={q} venue={venue} onChange={(s) => setQ(s)} />
        </div>
        <p className="text-[11px] uppercase tracking-wider text-subtle">
          {rows.length} of {HL_COUNT} markets
        </p>
        <div className="overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">Ticker</th>
                <th className="px-3 py-2 font-medium">Terminal</th>
                <th className="px-3 py-2 font-medium">HL name</th>
                <th className="px-3 py-2 font-medium">Venue</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Max lev</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.terminalSymbol} className="border-t border-border/80">
                  <td className="px-3 py-1.5 font-mono">{a.symbol}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-muted">{a.terminalSymbol}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-muted">{a.hl}</td>
                  <td className="px-3 py-1.5 text-xs uppercase tracking-wider text-subtle">
                    {a.dex === "xyz" ? "Trade.XYZ" : "Hyperliquid"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted">{a.assetClass}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{a.maxLeverage}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
