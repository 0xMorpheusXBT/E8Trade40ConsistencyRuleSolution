import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ACCOUNT_SIZES } from "@/lib/e8/catalog";
import { fmtSize } from "@/lib/e8/format";
import { useDesk } from "@/lib/e8/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Plan" },
  { to: "/desk", label: "Desk" },
  { to: "/catalog", label: "Offerings" },
  { to: "/markets", label: "Markets" },
  { to: "/rule", label: "40% Rule" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-fg">
              40
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium tracking-tight">40% Consistency Rule</span>
              <span className="block text-[11px] uppercase tracking-wider text-subtle">E8 Markets Terminal</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-2.5 py-2 text-sm whitespace-nowrap sm:px-3",
                  pathname === item.to ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </div>
  );
}

export function AccountBar() {
  const size = useDesk((s) => s.size);
  const stage = useDesk((s) => s.stage);
  const consistencyPct = useDesk((s) => s.consistencyPct);
  const setSize = useDesk((s) => s.setSize);
  const setStage = useDesk((s) => s.setStage);
  const setConsistencyPct = useDesk((s) => s.setConsistencyPct);
  const loadSample = useDesk((s) => s.loadSample);
  const resetCycle = useDesk((s) => s.resetCycle);
  const newFundedBook = useDesk((s) => s.newFundedBook);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary bg-primary/10 px-4 py-2 text-sm text-primary">
          E8 One
        </span>
        <span className="hidden h-5 w-px bg-border sm:block" />
        {(["challenge", "performance"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={cn(
              "rounded-full px-3 py-2 text-xs uppercase tracking-wider",
              stage === s ? "bg-surface-2 text-fg" : "text-subtle hover:text-fg",
            )}
          >
            {s}
          </button>
        ))}
        <div className="flex w-full flex-wrap gap-3 sm:ml-auto sm:w-auto">
          <button type="button" onClick={newFundedBook} className="text-xs text-muted hover:text-fg">
            New funded book
          </button>
          <button type="button" onClick={loadSample} className="text-xs text-muted hover:text-fg">
            Load $500K sample
          </button>
          <button type="button" onClick={resetCycle} className="text-xs text-muted hover:text-danger">
            Reset cycle
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ACCOUNT_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-2 font-mono text-sm tabular-nums",
              size === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:text-fg",
            )}
          >
            {fmtSize(s)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 text-sm text-muted">
        <span className="text-[11px] uppercase tracking-wider text-subtle">Consistency</span>
        <input
          type="range"
          min={20}
          max={60}
          step={5}
          value={consistencyPct}
          onChange={(e) => setConsistencyPct(Number(e.target.value))}
          className="h-1.5 flex-1 accent-primary"
        />
        <span className="w-10 font-mono tabular-nums text-fg">{consistencyPct}%</span>
      </label>
    </div>
  );
}
