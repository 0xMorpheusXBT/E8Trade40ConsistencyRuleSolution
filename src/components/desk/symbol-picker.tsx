import { useEffect, useMemo, useRef, useState } from "react";
import {
  HL_COUNT,
  HL_NATIVE_COUNT,
  XYZ_COUNT,
  searchHlAssets,
  type HlAsset,
  type VenueFilter,
} from "@/lib/e8/hl-universe";
import { cn } from "@/lib/utils";

const VENUES: { id: VenueFilter; label: string; count: number }[] = [
  { id: "all", label: "All", count: HL_COUNT },
  { id: "hl", label: "Hyperliquid", count: HL_NATIVE_COUNT },
  { id: "xyz", label: "Trade.XYZ", count: XYZ_COUNT },
];

export function VenueToggle({
  value,
  onChange,
}: {
  value: VenueFilter;
  onChange: (v: VenueFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {VENUES.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider",
            value === v.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-subtle hover:text-fg",
          )}
        >
          {v.label}
          <span className="ml-1 font-mono text-subtle">{v.count}</span>
        </button>
      ))}
    </div>
  );
}

export function SymbolPicker({
  value,
  onChange,
  className,
  venue = "all",
}: {
  value: string;
  onChange: (symbol: string, asset: HlAsset) => void;
  className?: string;
  venue?: VenueFilter;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const hits = useMemo(() => searchHlAssets(q, venue === "xyz" || venue === "hl" ? 80 : 40, venue), [q, venue]);
  const placeholder =
    venue === "xyz"
      ? `Search ${XYZ_COUNT} Trade.XYZ markets`
      : venue === "hl"
        ? `Search ${HL_NATIVE_COUNT} Hyperliquid perps`
        : `Search ${HL_COUNT} HL + XYZ markets`;

  useEffect(() => {
    setQ(value);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (a: HlAsset) => {
    onChange(a.symbol, a);
    setQ(a.symbol);
    setOpen(false);
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <input
        className="h-10 w-full rounded-md border border-border bg-transparent px-3 font-mono text-sm uppercase text-fg outline-none focus:border-primary"
        value={q}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const a = hits[active];
            if (a) pick(a);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-lg">
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">No market matches on this venue.</li>
          ) : (
            hits.map((a, i) => (
              <li key={a.hl}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(a)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left",
                    i === active ? "bg-primary/15 text-fg" : "text-fg hover:bg-surface-2",
                  )}
                >
                  <span className="font-mono text-sm">{a.symbol}</span>
                  <span className="truncate text-[11px] uppercase tracking-wider text-subtle">
                    {a.assetClass} · {a.dex === "native" ? "HL" : a.dex === "xyz" ? "XYZ" : a.dex} · {a.maxLeverage}x
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
