/**
 * E8 One Perpetual account offerings.
 * Scraped 2026-09-04 from https://e8markets.com/?market=perpetual#accounts
 * with 50% OFF (code E8) applied at checkout.
 *
 * The 40% Best Day Rule is official on E8 One (and E8 One Crypto) in the
 * SimFi™ Performance stage only. E8 Pro is out of scope — no consistency
 * rule is published on that product.
 *
 * Guardrail percentages are taken from the $500K configurator card and
 * scaled linearly across sizes.
 */

export const ACCOUNT_SIZES = [5_000, 10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 500_000] as const;
export type AccountSize = (typeof ACCOUNT_SIZES)[number];
export type ProductId = "e8-one";
export type Stage = "challenge" | "performance";

export type Offering = {
  product: ProductId;
  productLabel: string;
  size: AccountSize;
  priceOriginal: number;
  priceSale: number;
  profitTargetPct: number;
  drawdownType: "dynamic";
  drawdownPct: number;
  dailyDrawdownPct: number;
  dailyProfitCapPct: number | null;
  officialConsistencyPct: number;
  payoutPct: number;
  firstPayoutDays: number;
  passMinDays: number | null;
  activationFee: boolean;
  tagline: string;
};

const ONE_PRICES: Record<AccountSize, { original: number; sale: number }> = {
  5_000: { original: 48, sale: 24 },
  10_000: { original: 88, sale: 44 },
  25_000: { original: 188, sale: 94 },
  50_000: { original: 288, sale: 144 },
  100_000: { original: 488, sale: 244 },
  200_000: { original: 798, sale: 399 },
  400_000: { original: 1_598, sale: 799 },
  500_000: { original: 1_998, sale: 999 },
};

function buildOne(size: AccountSize): Offering {
  const p = ONE_PRICES[size];
  return {
    product: "e8-one",
    productLabel: "E8 One",
    size,
    priceOriginal: p.original,
    priceSale: p.sale,
    profitTargetPct: 9,
    drawdownType: "dynamic",
    drawdownPct: 6,
    dailyDrawdownPct: 4,
    dailyProfitCapPct: null,
    officialConsistencyPct: 40,
    payoutPct: 80,
    firstPayoutDays: 3,
    passMinDays: 1,
    activationFee: false,
    tagline: "Most customizable product · Pass in one day · Uncapped earnings",
  };
}

export const OFFERINGS: Offering[] = ACCOUNT_SIZES.map(buildOne);

export function getOffering(product: ProductId, size: AccountSize): Offering {
  const found = OFFERINGS.find((o) => o.product === product && o.size === size);
  if (!found) throw new Error(`Unknown offering ${product} ${size}`);
  return found;
}

export function dollars(size: AccountSize, pct: number): number {
  return Math.round(size * (pct / 100) * 100) / 100;
}

export type Guardrails = {
  profitTarget: number;
  drawdown: number;
  dailyDrawdown: number;
  dailyProfitCap: number | null;
  minPayout: number;
  budgetCap: number;
};

/** Dollar guardrails for a given size. Min payout = 50% of daily DD + $1 (E8 help example). */
export function guardrailsFor(offering: Offering, equity?: number): Guardrails {
  const dailyDrawdown = dollars(offering.size, offering.dailyDrawdownPct);
  return {
    profitTarget: dollars(offering.size, offering.profitTargetPct),
    drawdown: dollars(offering.size, offering.drawdownPct),
    dailyDrawdown,
    dailyProfitCap: offering.dailyProfitCapPct == null ? null : dollars(offering.size, offering.dailyProfitCapPct),
    minPayout: Math.floor(dailyDrawdown * 0.5) + 1,
    budgetCap: Math.round((equity ?? offering.size) * 0.05 * 100) / 100,
  };
}

export const PRODUCT_META: Record<ProductId, { label: string; tagline: string; consistencyNote: string }> = {
  "e8-one": {
    label: "E8 One",
    tagline: "Most customizable · 1-day pass · Uncapped earnings",
    consistencyNote:
      "Official 40% Best Day Rule applies in the SimFi™ Performance stage. No consistency rule during Challenge. E8 Pro is out of scope — that product has no consistency rule.",
  },
};

export const SCRAPE = {
  source: "https://e8markets.com/?market=perpetual#accounts",
  market: "perpetual" as const,
  scrapedAt: "2026-09-04",
  promo: { code: "E8", offPct: 50, note: "50% OFF on first order with code E8" },
  help: "https://help.e8markets.com/en/articles/10450125-40-best-day-rule",
  terminal: "https://trade.e8markets.com/trade",
};
