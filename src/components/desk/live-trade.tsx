import type { ReactNode } from "react";
import { useState } from "react";
import { AlertTriangle, Ban, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SymbolPicker, VenueToggle } from "@/components/desk/symbol-picker";
import type { ConsistencySnapshot } from "@/lib/e8/consistency";
import { fmtMoney, clsPnL } from "@/lib/e8/format";
import { findHlAsset, type VenueFilter } from "@/lib/e8/hl-universe";
import { useDesk } from "@/lib/e8/store";
import { cn } from "@/lib/utils";

export function LiveTradePanel({ snap }: { snap: ConsistencySnapshot }) {
  const live = useDesk((s) => s.live);
  const patchLive = useDesk((s) => s.patchLive);
  const bookLive = useDesk((s) => s.bookLive);
  const setLive = useDesk((s) => s.setLive);
  const asset = findHlAsset(live?.symbol);
  const [venue, setVenue] = useState<VenueFilter>("all");

  if (!live) {
    return (
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-fg">Live trade</h2>
          <p className="mt-1 text-sm text-muted">
            No open position. Pick any Hyperliquid or Trade.XYZ market, then enter USD notional and
            UP&L from the terminal to run the cut-now check.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setLive({
              symbol: "SP500",
              side: "long",
              openPnl: 0,
              notional: 100_000,
              entry: 0,
              mark: 0,
            })
          }
        >
          Add live position
        </Button>
      </div>
    );
  }

  const overCap = snap.liveHeadroom != null && snap.liveHeadroom < 0;
  const tone = snap.closeNow
    ? "breach"
    : snap.scaleOut || snap.alert === "danger" || overCap
      ? "danger"
      : snap.alert === "watch"
        ? "watch"
        : "ok";
  const badgeLabel = snap.closeNow ? "Close now" : snap.scaleOut ? "Scale out" : overCap ? "Over cap" : "Tracking";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-fg">Live trade</h2>
            <Badge tone={tone === "ok" ? "ok" : tone === "watch" ? "watch" : tone === "breach" ? "breach" : "danger"}>
              {badgeLabel}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted">
            {live.side} · {live.symbol} · {fmtMoney(live.notional, { compact: true })} notional
            {asset ? ` · ${asset.dex === "xyz" ? "Trade.XYZ" : asset.dex === "native" ? "Hyperliquid" : asset.venue}` : ""}
          </p>
        </div>
        <button className="text-xs text-subtle hover:text-fg" onClick={() => setLive(null)} type="button">
          Clear
        </button>
      </div>

      {snap.closeNow ? (
        <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <Ban className="mt-0.5 size-4 shrink-0" />
          <span>
            Red alert. Flatten {live.symbol} at the bid. Booking {fmtMoney(live.openPnl, { signed: true })} would push
            today to {fmtMoney(snap.todayProjected)} — above the {Math.round(snap.ratio * 100)}% best-day ceiling.
            Do not partial this across sessions.
          </span>
        </div>
      ) : snap.scaleOut ? (
        <div className="flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2.5 text-sm text-warn">
          <Scissors className="mt-0.5 size-4 shrink-0" />
          <span>
            Scale out. Only {fmtMoney(snap.liveHeadroom ?? 0)} of additional open profit can still be booked today.
            Bank a partial and cap the runner.
          </span>
        </div>
      ) : overCap ? (
        <div className="flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2.5 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Today is already {fmtMoney(snap.todayProjected)} vs a max of {fmtMoney(snap.maxAllowedToday ?? 0)}. Stand
            down. Dilute the best day on a later session — do not add to today.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-muted">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {snap.liveHeadroom == null
              ? "First day of the cycle — this print sets the bar every later day has to dilute."
              : `${fmtMoney(snap.liveHeadroom)} of room remains before this trade becomes a ${Math.round(snap.ratio * 100)}% best day.`}
          </span>
        </div>
      )}

      <VenueToggle value={venue} onChange={setVenue} />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Symbol">
          <SymbolPicker value={live.symbol} venue={venue} onChange={(symbol) => patchLive({ symbol })} />
        </Field>
        <Field label="Side">
          <div className="flex h-10 overflow-hidden rounded-md border border-border">
            {(["long", "short"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => patchLive({ side })}
                className={cn(
                  "flex-1 text-xs uppercase tracking-wider",
                  live.side === side ? (side === "long" ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger") : "text-muted",
                )}
              >
                {side}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notional (USD)">
          <Input
            type="number"
            value={live.notional}
            onChange={(e) => patchLive({ notional: Number(e.target.value) })}
          />
        </Field>
        <Field label="Open P&L (net)">
          <Input
            type="number"
            value={live.openPnl}
            onChange={(e) => patchLive({ openPnl: Number(e.target.value) })}
            className={clsPnL(live.openPnl)}
          />
        </Field>
        <Field label="Entry">
          <Input type="number" value={live.entry} onChange={(e) => patchLive({ entry: Number(e.target.value) })} />
        </Field>
        <Field label="Mark">
          <Input type="number" value={live.mark} onChange={(e) => patchLive({ mark: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="mt-auto flex gap-2">
        <Button className="flex-1" variant={snap.closeNow ? "danger" : "default"} onClick={bookLive}>
          {snap.closeNow ? "Flatten & book" : "Book net P&L to today"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] uppercase tracking-wider text-subtle">{label}</span>
      {children}
    </label>
  );
}
