import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pullTradeHistory } from "./history.functions";
import { useDesk, useDeskHydrated } from "./store";

const KEY_STORAGE = "e8-terminal-read-key";

export function readTerminalKey(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(KEY_STORAGE) ?? "";
}

export function writeTerminalKey(key: string) {
  if (typeof sessionStorage === "undefined") return;
  if (key) sessionStorage.setItem(KEY_STORAGE, key);
  else sessionStorage.removeItem(KEY_STORAGE);
}

export function useHistorySync(opts?: { pollMs?: number }) {
  const hydrated = useDeskHydrated();
  const size = useDesk((s) => s.size);
  const applyHistory = useDesk((s) => s.applyHistory);
  const dirty = useDesk((s) => s.historyDirty);
  const pull = useServerFn(pullTradeHistory);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const inflight = useRef(false);

  const sync = useCallback(
    async (opts?: { force?: boolean }) => {
      if (inflight.current) return;
      if (dirty && !opts?.force) return;
      inflight.current = true;
      setSyncing(true);
      setError(null);
      try {
        const snap = await pull({
          data: {
            size,
            apiKey: readTerminalKey() || undefined,
          },
        });
        applyHistory(snap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Trade History sync failed");
      } finally {
        inflight.current = false;
        setSyncing(false);
      }
    },
    [applyHistory, dirty, pull, size],
  );

  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    if (!hydrated) return;
    void syncRef.current({ force: true });
    const poll = opts?.pollMs ?? 30_000;
    const id = window.setInterval(() => {
      void syncRef.current();
    }, poll);
    return () => window.clearInterval(id);
  }, [hydrated, size, opts?.pollMs]);

  return { sync: () => sync({ force: true }), syncing, error };
}
