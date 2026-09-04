import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "ok" | "watch" | "danger" | "breach";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        tone === "neutral" && "bg-surface-2 text-muted",
        tone === "ok" && "bg-ok/15 text-ok",
        tone === "watch" && "bg-warn/15 text-warn",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "breach" && "bg-danger text-fg",
        className,
      )}
    >
      {children}
    </span>
  );
}
