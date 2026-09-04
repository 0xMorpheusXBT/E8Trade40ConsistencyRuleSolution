import { useState } from "react";
import { ChevronDown, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isoToday } from "@/lib/e8/engine/consistency";
import { clsPnL, fmtMoney } from "@/lib/e8/format";
import { fmtPulledAt } from "@/lib/e8/tape/history";
import { useDesk } from "@/lib/e8/state/store";
import { useHistorySync } from "@/lib/e8/state/use-history-sync";
import { cn } from "@/lib/utils";
import { SymbolPicker, VenueToggle } from "@/components/desk/symbol-picker";
import { HL_COUNT, type VenueFilter } from "@/lib/e8/markets/hl-universe";

export function DayLog() {
  const days = useDesk((s) => s.days);
  const trades = useDesk((s) => s.trades);
  const addDay = useDesk((s) => s.addDay);
  const removeDay = useDesk((s) => s.removeDay);
  const lastSyncedAt = useDesk((s) => s.lastSyncedAt);
  const historySource = useDesk((s) => s.historySource);
  const historyAccount = useDesk((s) => s.historyAccount);
  const { sync, syncing, error } = useHistorySync();
  const [date, setDate] = useState(isoToday());
  const [pnl, setPnl] = useState("");
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);

  const cycleGross = days.reduce((a, d) => a + (d.grossPnl ?? d.closedPnl), 0);
  const cycleFees = days.reduce((a, d) => a + (d.fees ?? 0), 0);
  const cycleNet = days.reduce((a, d) => a + d.closedPnl, 0);

  return (
    <section className="flex h-full min-h-72 flex-col">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-fg">Booked days · net of fees</h2>
          <p className="mt-0.5 text-[11px] text-subtle">
            {historyAccount ?? "E8 Terminal · Trade History"} · {historySource === "terminal" ? "live MCP" : "replay"} ·{" "}
            {fmtPulledAt(lastSyncedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-subtle">{days.length} sessions</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void sync()} disabled={syncing}>
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing" : "Sync history"}
          </Button>
        </div>
      </header>
      {error ? <p className="mb-2 text-xs text-danger">{error}</p> : null}

      <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
        <Stat k="Profit" v={fmtMoney(cycleGross, { signed: true })} tone={cycleGross} />
        <Stat k="Fees" v={fmtMoney(-Math.abs(cycleFees), { signed: true })} tone={-1} />
        <Stat k="Net PNL" v={fmtMoney(cycleNet, { signed: true })} tone={cycleNet} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Fills</th>
              <th className="px-3 py-2 font-medium">Profit</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Fee</th>
              <th className="px-3 py-2 font-medium">Net PNL</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {days.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  {syncing ? "Pulling Trade History…" : "No closed fills this cycle. Sync from the terminal."}
                </td>
              </tr>
            ) : (
              [...days].reverse().map((d) => {
                const fills = trades.filter((t) => t.date === d.date && t.booked);
                const open = openDate === d.date;
                return (
                  <DayBlock
                    key={d.id}
                    date={d.date}
                    fills={d.tradeCount ?? fills.length}
                    gross={d.grossPnl ?? d.closedPnl}
                    fees={d.fees ?? 0}
                    net={d.closedPnl}
                    notes={d.notes}
                    open={open}
                    onToggle={() => setOpenDate(open ? null : d.date)}
                    rows={fills}
                    onRemove={() => removeDay(d.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="mt-3 text-left text-[11px] uppercase tracking-wider text-subtle hover:text-fg"
        onClick={() => setShowAdjust((v) => !v)}
      >
        {showAdjust ? "Hide adjustment" : "Manual adjustment"}
      </button>
      {showAdjust ? (
        <form
          className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(pnl);
            if (!date || Number.isNaN(n)) return;
            addDay(date, n, "Manual adjustment · net");
            setPnl("");
          }}
        >
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input
            type="number"
            step="0.01"
            placeholder="Net PNL"
            value={pnl}
            onChange={(e) => setPnl(e.target.value)}
            required
          />
          <Button type="submit" size="sm" className="col-span-2 h-10 sm:col-span-1">
            <Plus /> Adjust
          </Button>
        </form>
      ) : null}
    </section>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone: number }) {
  return (
    <div className="rounded-md border border-border/80 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{k}</div>
      <div className={cn("font-mono text-sm tabular-nums", clsPnL(tone))}>{v}</div>
    </div>
  );
}

function DayBlock({
  date,
  fills,
  gross,
  fees,
  net,
  notes,
  open,
  onToggle,
  rows,
  onRemove,
}: {
  date: string;
  fills: number;
  gross: number;
  fees: number;
  net: number;
  notes?: string;
  open: boolean;
  onToggle: () => void;
  rows: {
    id: string;
    symbol: string;
    side: "long" | "short";
    pnl: number;
    fees: number;
    grossPnl?: number;
    volume?: number;
    notional?: number;
    entry?: number;
    exit?: number;
  }[];
  onRemove: () => void;
}) {
  return (
    <>
      <tr className="border-t border-border/80">
        <td className="px-3 py-2">
          <button type="button" onClick={onToggle} className="flex items-center gap-1 font-mono text-xs tabular-nums text-muted">
            <ChevronDown className={cn("size-3.5 transition", open ? "rotate-0" : "-rotate-90")} />
            {date}
          </button>
        </td>
        <td className="hidden px-3 py-2 font-mono text-xs text-muted sm:table-cell">{fills}</td>
        <td className={cn("px-3 py-2 font-mono text-xs tabular-nums", clsPnL(gross))}>
          {fmtMoney(gross, { signed: true })}
        </td>
        <td className="hidden px-3 py-2 font-mono text-xs tabular-nums text-muted sm:table-cell">
          {fmtMoney(fees)}
        </td>
        <td className={cn("px-3 py-2 font-mono text-sm tabular-nums", clsPnL(net))}>
          {fmtMoney(net, { signed: true })}
        </td>
        <td className="px-1">
          <button type="button" className="p-2 text-subtle hover:text-danger" onClick={onRemove} aria-label="Remove day">
            <Trash2 className="size-3.5" />
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-border/60 bg-bg-elevated/40">
          <td colSpan={6} className="px-3 py-2">
            <p className="mb-2 text-[11px] text-subtle">{notes ?? "Trade History fills"}</p>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-subtle">
                <tr>
                  <th className="py-1 text-left font-medium">Sym</th>
                  <th className="py-1 text-left font-medium">Side</th>
                  <th className="hidden py-1 text-left font-medium sm:table-cell">Notional</th>
                  <th className="py-1 text-left font-medium">Profit</th>
                  <th className="py-1 text-left font-medium">Fee</th>
                  <th className="py-1 text-left font-medium">Net PNL</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2 text-muted">
                      No fills on this session.
                    </td>
                  </tr>
                ) : (
                  rows.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1 font-mono">{t.symbol}</td>
                      <td className={t.side === "long" ? "text-ok" : "text-danger"}>{t.side}</td>
                      <td className="hidden font-mono text-muted sm:table-cell">
                        {t.notional ? fmtMoney(t.notional, { compact: true }) : "—"}
                      </td>
                      <td className={cn("font-mono tabular-nums", clsPnL(t.grossPnl ?? t.pnl + t.fees))}>
                        {fmtMoney(t.grossPnl ?? t.pnl + t.fees, { signed: true })}
                      </td>
                      <td className="font-mono tabular-nums text-muted">{fmtMoney(t.fees)}</td>
                      <td className={cn("font-mono tabular-nums", clsPnL(t.pnl))}>
                        {fmtMoney(t.pnl, { signed: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function TradeLog() {
  const trades = useDesk((s) => s.trades);
  const addTrade = useDesk((s) => s.addTrade);
  const removeTrade = useDesk((s) => s.removeTrade);
  const [symbol, setSymbol] = useState("");
  const [pnl, setPnl] = useState("");
  const [risk, setRisk] = useState("");
  const [side, setSide] = useState<"long" | "short">("long");
  const [venue, setVenue] = useState<VenueFilter>("all");

  return (
    <section className="flex h-full min-h-72 flex-col">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-fg">Trade tape</h2>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-subtle">
            {HL_COUNT} markets · USD notional · Net PNL
          </p>
        </div>
        <VenueToggle value={venue} onChange={setVenue} />
      </header>
      <form
        className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(pnl);
          if (Number.isNaN(n)) return;
          addTrade({
            date: isoToday(),
            symbol: symbol.toUpperCase(),
            side,
            pnl: n,
            fees: 0,
            grossPnl: n,
            risk: risk ? Number(risk) : undefined,
            booked: true,
          });
          setPnl("");
        }}
      >
        <div className="flex h-10 overflow-hidden rounded-md border border-border">
          {(["long", "short"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "px-3 text-xs uppercase",
                side === s ? (s === "long" ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger") : "text-muted",
              )}
            >
              {s[0].toUpperCase()}
            </button>
          ))}
        </div>
        <SymbolPicker value={symbol} venue={venue} onChange={(s) => setSymbol(s)} />
        <Input type="number" step="0.01" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="Net PNL" required />
        <Input type="number" step="0.01" value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="1R $" />
        <Button type="submit" size="sm" className="col-span-2 h-10 sm:col-span-1">
          <Plus /> Add
        </Button>
      </form>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Sym</th>
              <th className="px-3 py-2 font-medium">Net PNL</th>
              <th className="px-3 py-2 font-medium">Fee</th>
              <th className="px-3 py-2 font-medium">R</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  Waiting on Trade History.
                </td>
              </tr>
            ) : (
              [...trades].reverse().map((t) => (
                <tr key={t.id} className="border-t border-border/80">
                  <td className="px-3 py-2 font-mono text-xs">
                    <span className={t.side === "long" ? "text-ok" : "text-danger"}>{t.side === "long" ? "L" : "S"}</span>{" "}
                    {t.symbol}
                  </td>
                  <td className={cn("px-3 py-2 font-mono tabular-nums", clsPnL(t.pnl))}>{fmtMoney(t.pnl, { signed: true })}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">{fmtMoney(t.fees)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">
                    {t.risk ? `${(t.pnl / t.risk).toFixed(2)}R` : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="p-2 text-subtle hover:text-danger"
                      onClick={() => removeTrade(t.id)}
                      aria-label="Remove trade"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
