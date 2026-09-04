const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const moneyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtMoney(n: number, opts?: { compact?: boolean; signed?: boolean }): string {
  const abs = Math.abs(n);
  const formatted = opts?.compact && abs >= 1000 ? moneyCompact.format(n) : moneyFull.format(n);
  if (opts?.signed && n > 0) return `+${formatted}`;
  return formatted;
}

export function fmtMoneyShort(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  return money.format(n);
}

export function fmtPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtRatio(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}R`;
}

export function fmtSize(n: number): string {
  if (n >= 1000) return `$${n / 1000}K`;
  return `$${n}`;
}

export function clsPnL(n: number): string {
  if (n > 0) return "text-ok";
  if (n < 0) return "text-danger";
  return "text-muted";
}
