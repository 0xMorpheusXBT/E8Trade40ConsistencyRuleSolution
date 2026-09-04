import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMarketTape } from "./tape.functions";
import { TAPE_FALLBACK, type TapeSnapshot } from "./tape";

export function useTape(extraCoins: string[] = []) {
  const pull = useServerFn(getMarketTape);
  const [snap, setSnap] = useState<TapeSnapshot>(TAPE_FALLBACK);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await pull({ data: { coins: extraCoins } });
      setSnap(next);
    } catch {
      setSnap(TAPE_FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [pull, extraCoins.join("|")]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snap, loading, refresh };
}
