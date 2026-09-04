import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMarketTape } from "../tape/tape.functions";
import { TAPE_FALLBACK, type TapeSnapshot } from "../tape/tape";

let cached: TapeSnapshot | null = null;
let cachedAt = 0;
let inflight: Promise<TapeSnapshot> | null = null;
const TTL_MS = 20_000;

export function useTape(_extraCoins: string[] = []) {
  const pull = useServerFn(getMarketTape);
  const [snap, setSnap] = useState<TapeSnapshot>(cached ?? TAPE_FALLBACK);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (cached && now - cachedAt < TTL_MS) {
      setSnap(cached);
      setLoading(false);
      return cached;
    }
    if (inflight) {
      setLoading(true);
      try {
        const next = await inflight;
        setSnap(next);
        return next;
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    inflight = pull({ data: { coins: [] } })
      .then((next) => {
        cached = next;
        cachedAt = Date.now();
        return next;
      })
      .catch(() => TAPE_FALLBACK)
      .finally(() => {
        inflight = null;
      });
    try {
      const next = await inflight;
      setSnap(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [pull]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snap, loading, refresh };
}
