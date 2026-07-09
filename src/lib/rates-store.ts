/**
 * Rate and price lookups for per-tranche Schedule FA.
 *
 * TTBR: nearest-prior-working-day backfill (SBI publishes only on working
 * days; a Saturday trade converts at Friday's rate — the accepted convention).
 * Prices: same backfill for the daily-max peak scan.
 */

export type RateMap = Record<string, Record<string, number>>; // ccy → iso → rate
export type PriceMap = Record<string, Record<string, number>>; // symbol → iso → close

function nearestPrior(map: Record<string, number> | undefined, iso: string, maxBack = 10): number | null {
  if (!map) return null;
  const d = new Date(iso + "T00:00:00Z");
  for (let i = 0; i <= maxBack; i++) {
    const key = d.toISOString().slice(0, 10);
    if (map[key] !== undefined) return map[key];
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return null;
}

export class TtbrTable {
  constructor(private rates: RateMap) {}
  /** INR per unit of `ccy` on `iso` (nearest prior working day). null if absent. */
  rate(ccy: string, iso: string): number | null {
    return nearestPrior(this.rates[ccy], iso);
  }
  has(ccy: string): boolean {
    return Object.keys(this.rates[ccy] ?? {}).length > 0;
  }
  /** Latest available rate for a currency — the graceful fallback when a date is uncovered. */
  latest(ccy: string): number | null {
    const m = this.rates[ccy];
    if (!m) return null;
    const keys = Object.keys(m).sort();
    return keys.length ? m[keys[keys.length - 1]] : null;
  }
}

export class PriceTable {
  constructor(private prices: PriceMap) {}
  price(symbol: string, iso: string): number | null {
    return nearestPrior(this.prices[symbol], iso);
  }
  /** every ISO date on/after `from` up to `to` for which this symbol has a price */
  datesInRange(symbol: string, from: string, to: string): string[] {
    const m = this.prices[symbol];
    if (!m) return [];
    return Object.keys(m).filter((d) => d >= from && d <= to).sort();
  }
  has(symbol: string): boolean {
    return Object.keys(this.prices[symbol] ?? {}).length > 0;
  }
}
