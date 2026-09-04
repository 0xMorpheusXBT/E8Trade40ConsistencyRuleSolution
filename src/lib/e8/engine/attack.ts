/**
 * Plan of Attack — one engine, three desks.
 *
 * Sprint: full-port, pass the eval (or dump the funded print) in as few
 * 4h expansions as the tape will give you.
 * Measured: partial margin, R/R, winning-trade count, stay under 40%.
 * Vol: rank HIP-3 + any HL / Trade.XYZ market by how probable the
 * remaining dollars are, given 4h expansion, 4h volume, 24h movement.
 *
 * Challenge: remaining = profit target − booked. No 40% cap.
 * Performance: remaining = effective target − cycle; max print = 40% of target.
 */

import type { Instrument } from "../markets/instruments.ts";
import { sizedNotional } from "../markets/limits.ts";
import { CLASS_RANGE, impliedVolAnn, tapeFor, type TapeSnapshot } from "../tape/tape.ts";

export type Persona = "sprint" | "measured" | "vol";

export type AttackFit = "one-print" | "few-prints" | "grind" | "too-thin" | "locks-40";

export type AttackInput = {
  stage: "challenge" | "performance";
  size: number;
  equity: number;
  remaining: number;
  maxPrint: number | null;
  dailyDrawdown: number;
  winRate: number;
  rewardRisk: number;
  marginUse: number;
  persona: Persona;
};

export type AttackRow = {
  symbol: string;
  hl: string;
  venue: string;
  leverage: number;
  mark: number;
  notional: number;
  marginUse: number;
  movePct: number;
  movePx: number;
  slPct: number;
  slPx: number;
  lossAtSl: number;
  tpPx: number;
  range4h: number;
  range24h: number;
  vol4h: number;
  dayNtlVlm: number;
  dayPct: number;
  ivAnn: number;
  atrUnits: number;
  expansionsToGoal: number;
  winningTrades: number;
  expectedTrades: number;
  probability: number;
  fit: AttackFit;
  dollarsPer4h: number;
  dollarsPer24h: number;
  why: string;
};

export type AttackPlan = {
  goal: string;
  remaining: number;
  maxPrint: number | null;
  persona: Persona;
  pick: AttackRow | null;
  rows: AttackRow[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function ceilPos(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n - 1e-9);
}

export function planAttack(input: AttackInput, instruments: Instrument[], tape: TapeSnapshot): AttackPlan {
  const remaining = Math.max(0, input.remaining);
  const margin = clamp(input.marginUse, 0.05, 1);
  const wr = clamp(input.winRate, 0.05, 0.95);
  const rr = Math.max(0.25, input.rewardRisk);
  const equity = Math.max(1, input.equity);
  const daily = Math.max(1, input.dailyDrawdown);

  const rows = instruments.map((inst) =>
    scoreMarket(inst, tape, { remaining, margin, wr, rr, equity, daily, maxPrint: input.maxPrint, stage: input.stage }),
  );

  const ranked = [...rows].sort((a, b) => b.probability - a.probability || b.dayNtlVlm - a.dayNtlVlm);
  const pick = pickFor(input.persona, ranked);

  const goal =
    input.stage === "challenge"
      ? `Pass eval — print ${fmt(remaining)} more (no 40% cap)`
      : input.maxPrint != null
        ? `Funded print — ${fmt(remaining)} left, max ${fmt(input.maxPrint)} today under 40%`
        : `Funded print — ${fmt(remaining)} left`;

  return { goal, remaining, maxPrint: input.maxPrint, persona: input.persona, pick, rows: ranked };
}

function scoreMarket(
  inst: Instrument,
  tape: TapeSnapshot,
  ctx: {
    remaining: number;
    margin: number;
    wr: number;
    rr: number;
    equity: number;
    daily: number;
    maxPrint: number | null;
    stage: "challenge" | "performance";
  },
): AttackRow {
  const m = tapeFor(inst.symbol, tape) ?? tapeFor(inst.hl, tape);
  const klass = CLASS_RANGE[inst.assetClass] ?? CLASS_RANGE.crypto;
  const mark = m?.mark || inst.mark;
  const range4h = m?.range4h || klass.range4h;
  const range24h = m?.range24h || klass.range24h;
  const vol4h = m?.vol4h || (m?.dayNtlVlm ?? 0) / 6;
  const dayNtlVlm = m?.dayNtlVlm ?? 0;
  const dayPct = m?.dayPct ?? 0;

  const notional = sizedNotional(ctx.equity, inst.leverage, ctx.margin, inst.maxNotional);
  const movePct = notional > 0 ? ctx.remaining / notional : 1;
  const movePx = mark * movePct;
  const slPct = notional > 0 ? ctx.daily / notional : 1;
  const slPx = mark * slPct;
  const lossAtSl = Math.min(ctx.daily, notional * slPct);
  const tpPx = mark + movePx;
  const atrUnits = range4h > 0 ? movePct / range4h : 99;
  const expansionsToGoal = ceilPos(atrUnits);
  const dollarsPer4h = notional * range4h;
  const dollarsPer24h = notional * Math.abs(range24h);

  const printCap = ctx.stage === "performance" && ctx.maxPrint != null ? ctx.maxPrint : Infinity;
  const plannedWin = Math.min(ctx.remaining, printCap, Math.max(1, dollarsPer4h * 0.85));
  const risk = plannedWin / ctx.rr;
  const winningTrades = plannedWin > 0 ? ceilPos(ctx.remaining / plannedWin) : 0;
  const expectancy = ctx.wr * plannedWin - (1 - ctx.wr) * risk;
  const expectedTrades = expectancy > 0 ? ceilPos(ctx.remaining / expectancy) : 0;

  const thin = dayNtlVlm > 0 && dayNtlVlm < notional * 1.5;
  const locks = Number.isFinite(printCap) && dollarsPer4h > printCap * 1.05 && ctx.margin > 0.45;
  let fit: AttackFit = "grind";
  if (thin) fit = "too-thin";
  else if (locks) fit = "locks-40";
  else if (atrUnits <= 1.15) fit = "one-print";
  else if (atrUnits <= 3.2) fit = "few-prints";

  const ivAnn = impliedVolAnn(range4h);
  const volumeScore = clamp(Math.log10(Math.max(1, dayNtlVlm)) / 10, 0, 1);
  const expansionFit = Math.exp(-0.75 * Math.max(0, atrUnits));
  const liq = thin ? 0.35 : 0.9 + 0.1 * volumeScore;
  const capPenalty = locks ? 0.4 : 1;
  const probability = clamp(expansionFit * (0.5 + 0.3 * volumeScore + 0.2 * liq) * capPenalty, 0.03, 0.94);

  const why = whyLine({ fit, atrUnits, dollarsPer4h, printCap, remaining: ctx.remaining, range4h, dayNtlVlm, inst, slPct });

  return {
    symbol: inst.symbol,
    hl: inst.hl,
    venue: inst.venue,
    leverage: inst.leverage,
    mark,
    notional,
    marginUse: ctx.margin,
    movePct,
    movePx,
    slPct,
    slPx,
    lossAtSl,
    tpPx,
    range4h,
    range24h,
    vol4h,
    dayNtlVlm,
    dayPct,
    ivAnn,
    atrUnits,
    expansionsToGoal,
    winningTrades,
    expectedTrades,
    probability,
    fit,
    dollarsPer4h,
    dollarsPer24h,
    why,
  };
}

function pickFor(persona: Persona, rows: AttackRow[]): AttackRow | null {
  if (rows.length === 0) return null;
  const liquid = rows.filter((r) => r.fit !== "too-thin");
  const pool = liquid.length ? liquid : rows;
  if (persona === "sprint") {
    return (
      pool.find((r) => r.fit === "one-print") ??
      pool.find((r) => r.fit === "few-prints") ??
      pool[0]
    );
  }
  if (persona === "measured") {
    const ranked = [...pool].sort((a, b) => {
      const af = a.fit === "locks-40" ? 1 : 0;
      const bf = b.fit === "locks-40" ? 1 : 0;
      if (af !== bf) return af - bf;
      return a.atrUnits - b.atrUnits || b.probability - a.probability;
    });
    return ranked[0];
  }
  return [...pool].sort((a, b) => b.ivAnn * b.probability - a.ivAnn * a.probability)[0];
}

function whyLine(n: {
  fit: AttackFit;
  atrUnits: number;
  dollarsPer4h: number;
  printCap: number;
  remaining: number;
  range4h: number;
  dayNtlVlm: number;
  inst: Instrument;
  slPct: number;
}): string {
  const exp = (n.range4h * 100).toFixed(2);
  const sl = (n.slPct * 100).toFixed(3);
  if (n.fit === "too-thin") {
    return `${n.inst.symbol} 24h volume ${fmt(n.dayNtlVlm)} is thinner than this notional. Size down or pick a heavier tape.`;
  }
  if (n.fit === "locks-40") {
    return `A single 4h expansion here is ${fmt(n.dollarsPer4h)} — above the ${fmt(n.printCap)} 40% ceiling. Cut margin or pick a quieter index.`;
  }
  if (n.fit === "one-print") {
    return `${n.atrUnits.toFixed(2)}× the 4h expansion (${exp}%). Tight SL ${sl}% of price. One clean session covers ${fmt(n.remaining)}.`;
  }
  if (n.fit === "few-prints") {
    return `${ceilPos(n.atrUnits)} expansions of ${exp}% cover the remaining ${fmt(n.remaining)}. Stop ${sl}% so daily DD is the 1R.`;
  }
  return `${ceilPos(n.atrUnits)} 4h expansions to grind ${fmt(n.remaining)}. Better as a measured book than a sprint.`;
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function remainingForStage(opts: {
  stage: "challenge" | "performance";
  profitTarget: number;
  cycleProfit: number;
  effectiveTarget: number;
}): number {
  if (opts.stage === "challenge") return Math.max(0, opts.profitTarget - opts.cycleProfit);
  return Math.max(0, opts.effectiveTarget - opts.cycleProfit);
}

export function instrumentFromTape(
  symbol: string,
  hl: string,
  venue: string,
  assetClass: Instrument["assetClass"],
  leverage: number,
  mark: number,
  maxNotional = Number.POSITIVE_INFINITY,
): Instrument {
  return {
    id: hl,
    symbol,
    hl,
    label: `${symbol} · ${venue}`,
    venue,
    book: venue === "Hyperliquid" ? "hl-perp" : "hip-3",
    assetClass,
    leverage,
    maxNotional,
    mark,
    note: `${leverage}x on ${venue}.`,
  };
}
