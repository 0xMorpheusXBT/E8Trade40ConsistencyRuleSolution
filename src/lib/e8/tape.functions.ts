import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pullMarketTape } from "./tape.server";

export const getMarketTape = createServerFn({ method: "POST" })
  .validator(z.object({ coins: z.array(z.string()).max(40).optional() }))
  .handler(async ({ data }) => {
    return pullMarketTape(data.coins ?? []);
  });
