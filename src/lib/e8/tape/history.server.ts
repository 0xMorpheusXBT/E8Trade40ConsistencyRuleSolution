/**
 * Server-only: pull closed fills from E8 Terminal MCP (e8_orders_list).
 * Falls back to the demo Trade History replay when no key is present
 * or the terminal is unreachable from this environment.
 */
import {
  demoHistory,
  parseClosedTrades,
  snapshotFromTrades,
  unwrapMcp,
  type HistorySnapshot,
} from "./history";

const MCP_URL = "https://trade.e8markets.com/api/mcp";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

async function mcpCall(apiKey: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(4000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MCP ${res.status}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function pullFromTerminal(opts: {
  size: number;
  apiKey?: string;
  accountId?: string;
}): Promise<HistorySnapshot> {
  const apiKey = opts.apiKey?.trim() || process.env.E8_API_KEY || "";
  const accountId = opts.accountId?.trim() || process.env.E8_ACCOUNT_ID || "";

  if (apiKey) {
    try {
      const raw = await mcpCall(apiKey, "e8_orders_list", {
        ...(accountId ? { accountId, account_id: accountId } : {}),
        status: ["FILLED", "SETTLED", "CLOSED"],
      });
      const trades = parseClosedTrades(raw);
      if (trades.length > 0) {
        const snap = snapshotFromTrades(trades, {
          source: "terminal",
          accountLabel: accountId ? `E8 Terminal · ${accountId}` : "E8 Terminal · Trade History",
          startingBalance: opts.size,
        });
        try {
          const info = await mcpCall(apiKey, "e8_account_info", accountId ? { accountId } : {});
          const unwrapped = unwrapMcp(info) as Record<string, unknown> | undefined;
          if (unwrapped && typeof unwrapped === "object") {
            const equity = num(unwrapped.equity ?? unwrapped.eqty ?? unwrapped.balance, NaN);
            if (Number.isFinite(equity)) snap.equity = equity;
          }
        } catch {
          /* account info is optional */
        }
        return snap;
      }
    } catch {
      /* fall through to demo replay */
    }
  }

  return demoHistory(opts.size);
}
