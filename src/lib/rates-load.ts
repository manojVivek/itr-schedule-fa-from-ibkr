/**
 * Client-side loaders for the two market-data inputs:
 *  - SBI TTBR: static per-year JSON bundled with the app (public/data/ttbr/<year>.json)
 *  - Daily closes: the /api/prices proxy (Yahoo) — only ticker symbols leave the browser
 */

import type { PriceMap, RateMap } from "@/lib/rates-store";
import type { ParsedStatement } from "@/lib/types";

export interface PriceFetchResult {
  prices: PriceMap; // keyed by the ORIGINAL statement symbol
  longNames: Record<string, string>;
  missing: string[]; // symbols the proxy could not price
}

/** Years whose TTBR is needed: the FA year + every year an acquisition date touches. */
export function ttbrYearsNeeded(statements: ParsedStatement[], faYear: number): number[] {
  const years = new Set<number>([faYear]);
  for (const s of statements) {
    for (const t of s.trades) {
      const y = Number(t.dateTime.slice(0, 4));
      if (Number.isFinite(y) && y > 2000) years.add(y);
    }
  }
  return [...years].sort();
}

export async function loadTtbr(years: number[]): Promise<{ rates: RateMap; missingYears: number[] }> {
  const rates: RateMap = { USD: {}, GBP: {} };
  const missingYears: number[] = [];
  await Promise.all(
    years.map(async (y) => {
      try {
        const res = await fetch(`/data/ttbr/${y}.json`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as RateMap;
        for (const ccy of Object.keys(data)) {
          rates[ccy] = { ...(rates[ccy] ?? {}), ...data[ccy] };
        }
      } catch {
        missingYears.push(y);
      }
    }),
  );
  return { rates, missingYears };
}

/** Map a statement symbol to its Yahoo ticker (GBP/LSE-listed → SYM.L). */
export function yahooTicker(symbol: string, currency: string, exchange?: string): string {
  if (currency === "GBP" || exchange === "LSEETF" || exchange === "LSE") return `${symbol}.L`;
  return symbol;
}

export async function loadPrices(
  symbols: { symbol: string; currency: string; exchange?: string }[],
  faYear: number,
): Promise<PriceFetchResult> {
  const bySymbol = new Map(symbols.map((s) => [s.symbol, yahooTicker(s.symbol, s.currency, s.exchange)]));
  const tickers = [...new Set(bySymbol.values())];
  const out: PriceFetchResult = { prices: {}, longNames: {}, missing: [] };
  if (tickers.length === 0) return out;

  const res = await fetch(`/api/prices?symbols=${encodeURIComponent(tickers.join(","))}&year=${faYear}`);
  if (!res.ok) {
    out.missing = [...bySymbol.keys()];
    return out;
  }
  const data = (await res.json()) as Record<string, { longName?: string; closes?: Record<string, number> } | null>;

  for (const [orig, ticker] of bySymbol) {
    const hit = data[ticker];
    if (hit?.closes && Object.keys(hit.closes).length > 0) {
      out.prices[orig] = hit.closes;
      if (hit.longName) out.longNames[orig] = hit.longName;
    } else {
      out.missing.push(orig);
    }
  }
  return out;
}
