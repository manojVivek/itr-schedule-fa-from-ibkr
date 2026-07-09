/** Round to the nearest rupee (integer INR everywhere). */
export function roundRupee(x: number | undefined | null): number {
  return Math.round(x ?? 0);
}

/** Indian-grouping INR display: 1367874 → "13,67,874". */
export function fmtINR(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** Tiny className joiner (no clsx dependency needed). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Mask an account number for display: U15602290 → U•••2290. */
export function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct;
  return `${acct[0]}•••${acct.slice(-4)}`;
}
