import { NextRequest, NextResponse } from "next/server";

/**
 * The app's ONLY server code: a thin Yahoo Finance proxy for daily closes.
 * Receives ticker symbols alone — never statements, accounts, or amounts.
 * Past-year series are immutable, so responses cache hard at the edge.
 */

interface SymbolPrices {
  currency?: string;
  longName?: string;
  closes: Record<string, number>;
}

async function fetchSeries(ticker: string, year: number): Promise<SymbolPrices | null> {
  const p1 = Math.floor(Date.UTC(year, 0, 1) / 1000);
  const p2 = Math.floor(Date.UTC(year + 1, 0, 1) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?period1=${p1}&period2=${p2}&interval=1d`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      chart?: {
        result?: {
          meta?: { currency?: string; longName?: string; shortName?: string };
          timestamp?: number[];
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[];
      };
    };
    const r = j.chart?.result?.[0];
    if (!r?.timestamp) return null;
    const closes: Record<string, number> = {};
    const quote = r.indicators?.quote?.[0]?.close ?? [];
    r.timestamp.forEach((ts, i) => {
      const c = quote[i];
      if (c == null) return;
      closes[new Date(ts * 1000).toISOString().slice(0, 10)] = c;
    });
    return { currency: r.meta?.currency, longName: r.meta?.longName ?? r.meta?.shortName, closes };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9.^-]{1,15}$/.test(s))
    .slice(0, 100);
  const year = Number(searchParams.get("year"));
  if (symbols.length === 0 || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "symbols and year required" }, { status: 400 });
  }

  const entries = await Promise.all(symbols.map(async (s) => [s, await fetchSeries(s, year)] as const));
  const body = Object.fromEntries(entries);

  const pastYear = year < new Date().getUTCFullYear();
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": pastYear
        ? "public, s-maxage=31536000, stale-while-revalidate=86400"
        : "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
