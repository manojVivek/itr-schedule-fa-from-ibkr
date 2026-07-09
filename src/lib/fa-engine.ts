/**
 * Per-tranche Schedule FA engine — one Table A3 row per acquisition lot, per
 * the Black Money Act "tranche-level" standard:
 *   initial = native cost × SBI TTBR on the acquisition date
 *   peak    = max over every held day of (units × dayPrice × dayTTBR)
 *   closing = units still held on 31-Dec × close price × TTBR on 31-Dec
 * FIFO consumes sells against the earliest lots. Dividends are attributed to
 * the lots held on each pay date at that day's TTBR. The custodial account
 * (Table A2) carries the un-invested cash (reconstructed running balance) and
 * the dividend rollup.
 *
 * Ported from tax-helper's fa-tranches.ts (the engine behind a real, accepted
 * AY 2026-27 filing) — including the split-factor peak anchoring: the daily
 * price feed is used only for intra-year SHAPE, anchored to IBKR's own 31-Dec
 * close, so a split-adjusted feed cannot distort levels.
 */

import { PriceTable, TtbrTable } from "@/lib/rates-store";
import { roundRupee } from "@/lib/util";
import { dedupeTrades } from "@/lib/parse-ibkr";
import type { FaA2Row, FaA3Row, FaResult, ParsedStatement } from "@/lib/types";

const iso = (dt: string) => dt.split(",")[0].trim();

/**
 * "<Full Name> (TICKER)" — name from the price feed's longName (any symbol),
 * else the statement's own instrument description, else just the ticker.
 */
function entityLabel(symbol: string, longName?: string, description?: string): string {
  const name = longName ?? (description && description !== symbol ? description : undefined);
  return name ? `${name} (${symbol})` : symbol;
}

const US_GEO = { countryName: "United States of America", countryCode: "2", zip: "99999999", address: "United States of America" };
const UK_GEO = { countryName: "United Kingdom", countryCode: "44", zip: "XXXXXX", address: "United Kingdom" };

const IBKR_A2 = {
  countryName: "United States of America",
  countryCode: "2",
  institution: "Interactive Brokers LLC",
  address: "One Pickwick Plaza, Greenwich, CT 06830, United States",
  zip: "06830",
  status: "Owner",
};

interface Tranche {
  symbol: string;
  currency: string;
  isin?: string;
  description?: string;
  srcYear?: string;
  unitPriceNative: number;
  acqDate: string; // ISO
  units: number; // originally acquired
  remaining: number; // after FIFO sells
  nativeCost: number; // basis (incl. commission)
  exitDate?: string; // when fully sold — bounds the peak window
  soldProceedsNative: number;
  dividendInr: number;
}

/** The FA-year (Jan–Dec) statement — source of positions, dividends, and cash. */
export function faYearStatement(statements: ParsedStatement[], faYear: number): ParsedStatement | undefined {
  return statements.find((s) => s.periodEnd === `${faYear}-12-31` && s.periodStart?.startsWith(`${faYear}-`));
}

function reconstructCash(
  cyStmt: ParsedStatement | undefined,
  ttbr: TtbrTable,
  faYear: number,
  rate: (ccy: string, d: string) => number,
): { peakInr: number; peakDate?: string; closingInr: number; reconOffInr: number } {
  if (!cyStmt) return { peakInr: 0, closingInr: 0, reconOffInr: 0 };
  const yearEnd = `${faYear}-12-31`;

  const start: Record<string, number> = {};
  const end: Record<string, number> = {};
  for (const r of cyStmt.cashReport) {
    if (r.currency === "Base Currency Summary" || !r.currency) continue; // USD-converted duplicate
    if (r.label === "Starting Cash") start[r.currency] = r.amount;
    else if (r.label === "Ending Cash") end[r.currency] = r.amount;
  }

  const events: { date: string; ccy: string; delta: number }[] = [];
  for (const f of cyStmt.cashFlows) {
    events.push({ date: iso(f.date ?? yearEnd), ccy: f.currency, delta: f.amount });
  }
  for (const t of cyStmt.trades) {
    events.push({ date: iso(t.dateTime), ccy: t.currency, delta: t.proceeds + (t.commission || 0) });
  }
  for (const d of cyStmt.dividends) events.push({ date: iso(d.date ?? yearEnd), ccy: d.currency, delta: d.amount });
  for (const w of cyStmt.wht) events.push({ date: iso(w.date ?? yearEnd), ccy: w.currency, delta: w.amount });

  const currencies = [...new Set([...Object.keys(start), ...Object.keys(end), ...events.map((e) => e.ccy)])];
  const bal: Record<string, number> = {};
  for (const c of currencies) bal[c] = start[c] ?? 0;

  let peakInr = currencies.reduce((s, c) => s + bal[c] * rate(c, `${faYear}-01-01`), 0);
  let peakDate: string | undefined = `${faYear}-01-01`;
  events.sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const e of events) {
    bal[e.ccy] = (bal[e.ccy] ?? 0) + e.delta;
    const inr = currencies.reduce((s, c) => s + Math.max(0, bal[c]) * rate(c, e.date), 0);
    if (inr > peakInr) {
      peakInr = inr;
      peakDate = e.date;
    }
  }

  const closingInr = currencies.reduce((s, c) => s + Math.max(0, end[c] ?? bal[c] ?? 0) * rate(c, yearEnd), 0);
  const reconEnd = currencies.reduce((s, c) => s + (bal[c] ?? 0) * rate(c, yearEnd), 0);
  const off = Math.round(Math.abs(reconEnd - closingInr));
  // a small residual (FX translation gain/loss, not a modelled flow) is expected
  return { peakInr: roundRupee(peakInr), peakDate, closingInr: roundRupee(closingInr), reconOffInr: off > 1500 ? off : 0 };
}

export function buildScheduleFa(
  statements: ParsedStatement[],
  faYear: number,
  ttbr: TtbrTable,
  prices: PriceTable,
  longNames: Record<string, string> = {},
): FaResult {
  const yearStart = `${faYear}-01-01`;
  const yearEnd = `${faYear}-12-31`;
  const warnings: string[] = [];
  const stats = { tranches: 0, securities: 0, withDailyPeak: 0, ttbrFallbacks: 0, peakFallbacks: 0 };

  // rate lookup with graceful degradation: exact/nearest-prior → latest known
  const rate = (ccy: string, d: string): number => {
    const r = ttbr.rate(ccy, d);
    if (r !== null) return r;
    stats.ttbrFallbacks += 1;
    return ttbr.latest(ccy) ?? 0;
  };

  const cyStmt = faYearStatement(statements, faYear);
  if (!cyStmt) {
    warnings.push(
      `No January–December ${faYear} statement found — year-end positions, dividends and cash need the full calendar-year Activity Statement.`,
    );
  }

  // trades pooled from every uploaded file (deduped) — buys may live in prior years
  const trades = dedupeTrades(statements);

  // 31-Dec close price — ONLY the FA-year statement's open positions are authoritative
  const closeFromPositions = new Map<string, number>();
  for (const p of cyStmt?.openPositions ?? []) {
    if (p.closePrice) closeFromPositions.set(p.symbol, p.closePrice);
  }

  // ── build lots (FIFO) per symbol ──
  const bySymbol = new Map<string, Tranche[]>();
  const buys = trades.filter((t) => t.quantity > 0).sort((a, b) => (iso(a.dateTime) < iso(b.dateTime) ? -1 : 1));
  const sells = trades.filter((t) => t.quantity < 0).sort((a, b) => (iso(a.dateTime) < iso(b.dateTime) ? -1 : 1));

  for (const b of buys) {
    const lot: Tranche = {
      symbol: b.symbol,
      currency: b.currency,
      isin: b.isin,
      description: b.description,
      srcYear: b.srcYear,
      unitPriceNative: b.price,
      acqDate: iso(b.dateTime),
      units: b.quantity,
      remaining: b.quantity,
      nativeCost: Math.abs(b.basis) || Math.abs(b.proceeds) + Math.abs(b.commission),
      soldProceedsNative: 0,
      dividendInr: 0,
    };
    (bySymbol.get(b.symbol) ?? bySymbol.set(b.symbol, []).get(b.symbol)!).push(lot);
  }

  for (const s of sells) {
    let toSell = -s.quantity;
    const perUnitProceeds = Math.abs(s.proceeds) / Math.abs(s.quantity);
    const lots = bySymbol.get(s.symbol) ?? [];
    for (const lot of lots) {
      if (toSell <= 0) break;
      if (lot.remaining <= 0) continue;
      const take = Math.min(lot.remaining, toSell);
      lot.remaining -= take;
      lot.soldProceedsNative += take * perUnitProceeds;
      lot.exitDate = iso(s.dateTime);
      toSell -= take;
    }
    if (toSell > 1e-6) {
      warnings.push(
        `Sale of ${(-s.quantity).toFixed(4)} ${s.symbol} on ${iso(s.dateTime)} exceeds the purchases in your files — ${toSell.toFixed(4)} units came from an earlier lot. Add the prior-year Activity Statement.`,
      );
    }
  }

  // ── dividend attribution (A3 col 12): per payout, to lots held on the pay date ──
  for (const d of cyStmt?.dividends ?? []) {
    if (!d.symbol || d.amount <= 0) continue;
    const lots = bySymbol.get(d.symbol);
    if (!lots) continue;
    const payDate = iso(d.date ?? yearEnd);
    const held = lots.filter((l) => l.acqDate <= payDate && (l.exitDate === undefined || l.exitDate > payDate));
    const heldUnits = held.reduce((a, l) => a + l.units, 0);
    if (heldUnits <= 0) continue;
    const inr = d.amount * rate(d.currency, payDate);
    for (const l of held) l.dividendInr += inr * (l.units / heldUnits);
  }

  // ── emit rows ──
  const a3: FaA3Row[] = [];
  const missingPrice = new Set<string>();
  const securities = new Set<string>();

  for (const lots of bySymbol.values()) {
    for (const lot of lots) {
      // disclosable only if held at some point during the FA year
      const goneBeforeYear = lot.remaining <= 1e-9 && lot.exitDate !== undefined && lot.exitDate < yearStart;
      if (lot.acqDate > yearEnd || goneBeforeYear) continue;
      stats.tranches += 1;
      securities.add(lot.symbol);
      const isGbp = lot.currency === "GBP";
      const geo = isGbp ? UK_GEO : US_GEO;

      const acqRate = rate(lot.currency, lot.acqDate);
      const initialInr = lot.nativeCost * acqRate;

      const closeRate = rate(lot.currency, yearEnd);
      const ibkrClose = closeFromPositions.get(lot.symbol) ?? null;
      const feedDec31 = prices.price(lot.symbol, yearEnd);
      const closePrice = ibkrClose ?? feedDec31 ?? null;
      const closingInr = lot.remaining > 1e-9 && closePrice ? lot.remaining * closePrice * closeRate : 0;

      // daily-max peak, feed anchored to IBKR's price basis (split-proof)
      const windowEnd = lot.exitDate && lot.remaining <= 1e-9 ? lot.exitDate : yearEnd;
      const windowStart = lot.acqDate > yearStart ? lot.acqDate : yearStart;
      const priceDates = prices.datesInRange(lot.symbol, windowStart, windowEnd);
      const anchor = ibkrClose && feedDec31 ? ibkrClose / feedDec31 : 1;
      let peakInr = Math.max(initialInr, closingInr);
      if (priceDates.length > 0 && (ibkrClose || feedDec31)) {
        stats.withDailyPeak += 1;
        for (const d of priceDates) {
          const p = prices.price(lot.symbol, d);
          const r = ttbr.rate(lot.currency, d);
          if (p === null || r === null) continue;
          const v = lot.units * (p * anchor) * r;
          if (v > peakInr) peakInr = v;
        }
      } else {
        stats.peakFallbacks += 1;
        missingPrice.add(lot.symbol);
      }

      const soldUnits = lot.units - lot.remaining;
      a3.push({
        symbol: lot.symbol,
        units: lot.units,
        unitPriceNative: lot.unitPriceNative,
        currency: lot.currency,
        acqTtbr: acqRate,
        srcYear: lot.srcYear,
        saleNote:
          soldUnits > 1e-9 && lot.exitDate ? `${soldUnits.toFixed(soldUnits % 1 ? 4 : 0)} sold ${lot.exitDate}` : undefined,
        countryName: geo.countryName,
        countryCode: geo.countryCode,
        entityName: entityLabel(lot.symbol, longNames[lot.symbol], lot.description),
        address: geo.address,
        zip: geo.zip,
        natureOfEntity: "Listed security (ETF/stock) via Interactive Brokers",
        dateAcquired: lot.acqDate,
        initialInr: roundRupee(initialInr),
        peakInr: roundRupee(peakInr),
        closingInr: roundRupee(closingInr),
        grossPaidInr: roundRupee(lot.dividendInr),
        grossProceedsInr: roundRupee(lot.soldProceedsNative * rate(lot.currency, lot.exitDate ?? yearEnd)),
        note: `${lot.units.toFixed(4)} units @ ${lot.acqDate} · TTBR ${acqRate.toFixed(2)}${
          priceDates.length ? ` · peak from ${priceDates.length} daily prices` : " · peak = max(initial, closing)"
        }`,
      });
    }
  }

  // ── uncovered holdings: at 31-Dec but no purchase history uploaded ──
  const uncovered = (cyStmt?.openPositions ?? [])
    .filter((p) => !bySymbol.has(p.symbol))
    .map((p) => ({ symbol: p.symbol, quantity: p.quantity, valueNative: p.value, currency: p.currency }));
  if (uncovered.length > 0) {
    const earliest = Math.min(
      ...statements.map((s) => Number(s.periodStart?.slice(0, 4) ?? faYear)).filter(Number.isFinite),
    );
    warnings.push(
      `${uncovered.map((u) => u.symbol).join(", ")} held at 31-Dec but have no purchase history in your files — add the ${earliest - 1} Activity Statement (IBKR → Statements → Activity → ${earliest - 1} → CSV). These rows are excluded from the download until resolved.`,
    );
  }

  // ── A2 custodial: dividends at per-payout TTBR + reconstructed cash ──
  let dividendInr = 0;
  for (const d of cyStmt?.dividends ?? []) dividendInr += d.amount * rate(d.currency, iso(d.date ?? yearEnd));
  const cash = reconstructCash(cyStmt, ttbr, faYear, rate);
  if (cash.reconOffInr) {
    warnings.push(
      `Cash reconstruction ended ₹${cash.reconOffInr.toLocaleString("en-IN")} off the statement's closing cash — the A2 peak is approximate (unmodelled FX translation).`,
    );
  }
  let proceedsFromSalesInr = 0;
  for (const r of a3) proceedsFromSalesInr += r.grossProceedsInr;

  const a2: FaA2Row | null = cyStmt
    ? {
        ...IBKR_A2,
        accountNumber: cyStmt.account,
        openingDate: undefined,
        peakInr: cash.peakInr,
        peakDate: cash.peakDate,
        closingInr: cash.closingInr,
        incomes: {
          Dividend: roundRupee(dividendInr),
          ...(proceedsFromSalesInr > 0
            ? { "Proceeds from sale or redemption of financial assets": roundRupee(proceedsFromSalesInr) }
            : {}),
        },
      }
    : null;

  if (missingPrice.size > 0) {
    warnings.push(
      `Daily-max peak unavailable for ${[...missingPrice].join(", ")} (no price series) — used max(initial, closing) instead.`,
    );
  }

  // ── reconciliation: Σ tranche closings must equal the year-end portfolio ──
  const coveredPositions = (cyStmt?.openPositions ?? []).filter((p) => bySymbol.has(p.symbol));
  const expectedClosingInr = roundRupee(
    coveredPositions.reduce((s, p) => s + p.value * rate(p.currency, yearEnd), 0),
  );
  const actualClosingInr = roundRupee(a3.reduce((s, r) => s + r.closingInr, 0));
  const reconciliation = {
    expectedClosingInr,
    actualClosingInr,
    ok: Math.abs(expectedClosingInr - actualClosingInr) <= Math.max(10, expectedClosingInr * 0.002),
  };
  if (!reconciliation.ok) {
    warnings.push(
      `Reconciliation gap: per-lot closing values sum to ₹${actualClosingInr.toLocaleString("en-IN")} but the year-end portfolio is ₹${expectedClosingInr.toLocaleString("en-IN")} — check for missing statements or partial files.`,
    );
  }

  a3.sort((a, b) =>
    a.entityName < b.entityName ? -1 : a.entityName > b.entityName ? 1 : (a.dateAcquired ?? "").localeCompare(b.dateAcquired ?? ""),
  );

  stats.securities = securities.size;
  const totals = {
    initialInr: roundRupee(a3.reduce((s, r) => s + r.initialInr, 0)),
    peakInr: roundRupee(a3.reduce((s, r) => s + r.peakInr, 0)),
    closingInr: actualClosingInr,
    dividendsInr: roundRupee(dividendInr),
    proceedsInr: roundRupee(proceedsFromSalesInr),
  };

  return { faYear, a3, a2, warnings, uncovered, reconciliation, stats, totals };
}
