import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SymbolPicker, VenueToggle } from "@/components/desk/symbol-picker";
import type { ConsistencySnapshot } from "@/lib/e8/engine/consistency";
import { fmtMoney, clsPnL } from "@/lib/e8/format";
import { findHlAsset, type VenueFilter } from "@/lib/e8/markets/hl-universe";
import { contractLimits, sizedNotional } from "@/lib/e8/markets/limits";
import { useDesk } from "@/lib/e8/state/store";
import { tapeFor } from "@/lib/e8/tape/tape";
import { useTape } from "@/lib/e8/state/use-tape";
import { cn } from "@/lib/utils";

export function LiveTradePanel({ snap }: { snap: ConsistencySnapshot }) {
  const live = useDesk((s) => s.live);
  const patchLive = useDesk((s) => s.patchLive);
  const bookLive = useDesk((s) => s.bookLive);
  const setLive = useDesk((s) => s.setLive);
  const equity = useDesk((s) => s.currentEquity);
  const asset = findHlAsset(live?.symbol);
  const limits = asset
    ? contractLimits(asset)
    : { maxLeverage: 15, maxNotional: Number.POSITIVE_INFINITY };
  const [venue, setVenue] = useState<VenueFilter>("all");
  const { snap: tape, loading: tapeLoading } = useTape();
  const quote = live?.symbol ? tapeFor(live.symbol, tape) : undefined;

  useEffect(() => {
    if (!live?.symbol) return;
    const t = tapeFor(live.symbol, tape) ?? (asset ? tapeFor(asset.hl, tape) : undefined);
    if (!t?.mark) return;
    if (live.mark === 0 || live.entry === 0) {
      patchLive({ mark: t.mark, entry: live.entry || t.mark });
    }
  }, [live?.symbol, tape.at]);

  if (!live) {
    return (
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-fg">Live trade</h2>
          <p className="mt-1 text-sm text-muted">
            No open position. Pick any of the 308 Hyperliquid / Trade.XYZ markets — mark, leverage and
            max notional load from the live book. Then enter USD notional and UP&L.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setLive({
              symbol: "",
              side: "long",
              openPnl: 0,
              notional: 0,
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
  const maxNotion = sizedNotional(equity || 100_000, limits.maxLeverage, 1, limits.maxNotional);

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
            {live.symbol
              ? `${live.side} · ${live.symbol} · ${limits.maxLeverage}x · ${fmtMoney(live.notional, { compact: true })} notional${asset ? ` · ${asset.dex === "xyz" ? "Trade.XYZ" : "Hyperliquid"}` : ""}`
              : "Pick any HL or Trade.XYZ market. Indices are SP500, XYZ100 and JP225 — same 15x / $1.30M contract."}
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
          <SymbolPicker
            value={live.symbol}
            venue={venue}
            onChange={(_symbol, next) => {
              const c = contractLimits(next);
              const t = tapeFor(next.symbol, tape) ?? tapeFor(next.hl, tape);
              const cap = sizedNotional(equity || 100_000, c.maxLeverage, 1, c.maxNotional);
              patchLive({
                symbol: next.symbol,
                mark: t?.mark ?? 0,
                entry: t?.mark ?? 0,
                openPnl: 0,
                notional: live.notional > 0 ? Math.min(live.notional, cap) : Math.min(100_000, cap),
              });
            }}
          />
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
        <Field label={`Notional (max ${fmtMoney(maxNotion, { compact: true })})`}>
          <Input
            type="number"
            value={live.notional || ""}
            max={maxNotion}
            onChange={(e) => {
              const n = Number(e.target.value);
              patchLive({ notional: Math.min(n, maxNotion) });
            }}
          />
        </Field>
        <Field label={`${limits.maxLeverage}x · Open P&L (net)`}>
          <Input
            type="number"
            value={live.openPnl}
            onChange={(e) => patchLive({ openPnl: Number(e.target.value) })}
            className={clsPnL(live.openPnl)}
          />
        </Field>
        <Field label="Entry">
          <Input
            type="number"
            value={live.entry || ""}
            onChange={(e) => patchLive({ entry: Number(e.target.value) })}
          />
        </Field>
        <Field label="Mark">
          <Input
            type="number"
            value={live.mark || ""}
            onChange={(e) => patchLive({ mark: Number(e.target.value) })}
          />
        </Field>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider text-subtle">
        {tapeLoading && !quote
          ? "Pulling Hyperliquid + Trade.XYZ marks…"
          : quote
            ? `Tape ${quote.mark} · 24h ${quote.dayPct >= 0 ? "+" : ""}${(quote.dayPct * 100).toFixed(2)}% · vol ${fmtMoney(quote.dayNtlVlm, { compact: true })} · fund ${(quote.funding * 100).toFixed(4)}% · ${quote.source}`
            : live.symbol
              ? "No tape yet for this market — type mark manually."
              : "308 markets on the wire. Type a ticker or filter by venue."}
      </p>

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
