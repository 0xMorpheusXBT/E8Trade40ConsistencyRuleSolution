import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pullFromTerminal } from "./history.server";

export const pullTradeHistory = createServerFn({ method: "POST" })
  .validator(
    z.object({
      size: z.number().min(1_000).max(1_000_000),
      apiKey: z.string().optional(),
      accountId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return pullFromTerminal(data);
  });
