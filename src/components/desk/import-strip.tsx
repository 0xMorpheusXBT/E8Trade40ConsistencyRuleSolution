import { useState } from "react";
import { Input } from "@/components/ui/input";
import { getOffering, guardrailsFor } from "@/lib/e8/markets/catalog";
import { fmtMoney } from "@/lib/e8/format";
import { fmtPulledAt } from "@/lib/e8/tape/history";
import { useDesk } from "@/lib/e8/state/store";
import { readTerminalKey, writeTerminalKey } from "@/lib/e8/state/use-history-sync";

export function ImportStrip() {
  const product = useDesk((s) => s.product);
  const size = useDesk((s) => s.size);
  const currentEquity = useDesk((s) => s.currentEquity);
  const startingBalance = useDesk((s) => s.startingBalance);
  const leftoverBuffer = useDesk((s) => s.leftoverBuffer);
  const live = useDesk((s) => s.live);
  const lastSyncedAt = useDesk((s) => s.lastSyncedAt);
  const historyAccount = useDesk((s) => s.historyAccount);
  const historySource = useDesk((s) => s.historySource);
  const setEquity = useDesk((s) => s.setEquity);
  const setStartingBalance = useDesk((s) => s.setStartingBalance);
  const setLeftoverBuffer = useDesk((s) => s.setLeftoverBuffer);
  const rails = guardrailsFor(getOffering(product, size), currentEquity);
  const [apiKey, setApiKey] = useState(readTerminalKey);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">Import from E8 Terminal</h2>
        <p className="text-[11px] text-subtle">
          {historyAccount ?? "Trade History"} · {historySource === "terminal" ? "MCP" : "replay"} ·{" "}
          {fmtPulledAt(lastSyncedAt)}
        </p>
      </div>
      <p className="mb-3 text-xs text-muted">
        Booked days pull from Trade History automatically (Profit, Fee, Net PNL). The 40% model uses Net PNL.
        Paste a <span className="text-fg">read:trade</span> API key to hit live MCP; otherwise this desk replays
        the connected book.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Starting / size</span>
          <Input
            type="number"
            value={startingBalance}
            onChange={(e) => setStartingBalance(Number(e.target.value))}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Equity (Eqty)</span>
          <Input type="number" value={currentEquity} onChange={(e) => setEquity(Number(e.target.value))} />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Leftover buffer</span>
          <Input
            type="number"
            value={leftoverBuffer}
            onChange={(e) => setLeftoverBuffer(Number(e.target.value))}
          />
        </label>
        <div className="grid gap-1">
          <span className="text-[11px] uppercase tracking-wider text-subtle">Open UP&L</span>
          <div className="flex h-10 items-center rounded-md border border-border bg-bg-elevated px-3 font-mono text-sm tabular-nums">
            {fmtMoney(live?.openPnl ?? 0, { signed: true })}
          </div>
        </div>
      </div>
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] uppercase tracking-wider text-subtle">Terminal API key · read:trade</span>
        <Input
          type="password"
          autoComplete="off"
          placeholder="Stored in this session only"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            writeTerminalKey(e.target.value);
          }}
        />
      </label>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Row k="Profit target" v={fmtMoney(rails.profitTarget)} />
        <Row k={`${getOffering(product, size).drawdownType} DD`} v={fmtMoney(rails.drawdown)} />
        <Row k="Daily DD" v={fmtMoney(rails.dailyDrawdown)} />
        <Row k="Min payout" v={fmtMoney(rails.minPayout)} />
        <Row k="5% budget cap" v={fmtMoney(rails.budgetCap)} />
        <Row k="Payout split" v={`${getOffering(product, size).payoutPct}%`} />
        <Row
          k="First payout"
          v={
            getOffering(product, size).firstPayoutDays === 0
              ? "On demand"
              : `${getOffering(product, size).firstPayoutDays} days`
          }
        />
      </dl>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
      <dt className="text-[11px] uppercase tracking-wider text-subtle">{k}</dt>
      <dd className="font-mono text-xs tabular-nums text-fg">{v}</dd>
    </div>
  );
}
