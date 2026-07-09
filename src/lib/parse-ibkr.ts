/**
 * IBKR Activity Statement parser (multi-section CSV) → plain typed rows.
 *
 * Every CSV row is `Section,Discriminator,…` where Discriminator is Header/
 * Data/SubTotal/Total. Sections used: Statement (period), Account Information,
 * Financial Instrument Information (symbol → ISIN/name enrichment), Trades
 * (stocks + forex legs), Dividends, Withholding Tax, Open Positions, Cash
 * Report, Deposits & Withdrawals. Amounts stay in native currency — INR
 * conversion is the engine's job.
 */

import Papa from "papaparse";
import type {
  CashFlow,
  CashReportRow,
  DividendRow,
  IbkrTrade,
  OpenPosition,
  ParsedStatement,
  WhtRow,
} from "@/lib/types";

const num = (s: string | undefined): number => {
  if (s === undefined || s.trim() === "") return NaN;
  const v = Number(s.replace(/,/g, ""));
  return Number.isFinite(v) ? v : NaN;
};

const MONTHS: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};

/** "January 1, 2025" → "2025-01-01" */
function parseLongDate(s: string): string | undefined {
  const m = s.trim().match(/^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/);
  if (!m || !MONTHS[m[1]]) return undefined;
  return `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}`;
}

function classifyPeriod(period: string): Pick<ParsedStatement, "periodStart" | "periodEnd" | "periodKind"> {
  const parts = period.split(" - ").map((p) => parseLongDate(p));
  const [start, end] = parts;
  if (!start || !end) return { periodKind: "unknown" };
  const kind =
    start.endsWith("-01-01") && end.endsWith("-12-31") && start.slice(0, 4) === end.slice(0, 4)
      ? "cy"
      : start.endsWith("-04-01") && end.endsWith("-03-31")
        ? "fy"
        : "custom";
  return { periodStart: start, periodEnd: end, periodKind: kind };
}

export function parseIbkrStatement(text: string, fileName: string): ParsedStatement {
  const cleaned = text.replace(/^﻿/, "");
  const parsed = Papa.parse<string[]>(cleaned, { skipEmptyLines: true });
  const rows = parsed.data;

  const stmt: ParsedStatement = {
    fileName,
    account: "",
    period: "",
    periodKind: "unknown",
    trades: [],
    dividends: [],
    wht: [],
    openPositions: [],
    cashReport: [],
    cashFlows: [],
    warnings: [],
  };

  if (rows.length === 0 || rows[0][0] !== "Statement") {
    stmt.warnings.push("Not an IBKR Activity Statement CSV (missing Statement section) — is this the right export?");
    return stmt;
  }

  const headers = new Map<string, string[]>();
  const instruments = new Map<string, { isin?: string; description?: string; exchange?: string }>();

  for (let i = 0; i < rows.length; i++) {
    const [section, disc, ...rest] = rows[i];
    if (disc === "Header") {
      headers.set(section, rest);
      continue;
    }
    if (disc !== "Data") continue;
    const header = headers.get(section);
    const get = (name: string): string | undefined => {
      const idx = header?.indexOf(name);
      return idx !== undefined && idx >= 0 ? rest[idx] : undefined;
    };

    switch (section) {
      case "Statement": {
        if (rest[0] === "Period") stmt.period = rest[1] ?? "";
        break;
      }
      case "Account Information": {
        if (rest[0] === "Account") stmt.account = rest[1] ?? "";
        break;
      }
      case "Financial Instrument Information": {
        const symbol = get("Symbol");
        if (symbol) {
          for (const sym of symbol.split(",").map((s) => s.trim())) {
            instruments.set(sym, {
              isin: get("Security ID"),
              description: get("Description"),
              exchange: get("Listing Exch"),
            });
          }
        }
        break;
      }
      case "Trades": {
        if (get("DataDiscriminator") !== "Order") break;
        const assetCategory = get("Asset Category") ?? "";
        // Forex conversions (e.g. GBP.USD) move cash between currencies — emit
        // both legs as cash flows so the A2 balance reconstruction stays honest.
        if (/Forex/i.test(assetCategory)) {
          const pair = get("Symbol") ?? "";
          const [base, quote] = pair.split(".");
          const date = (get("Date/Time") ?? "").split(",")[0].trim();
          const qty = num(get("Quantity"));
          const proceeds = num(get("Proceeds"));
          const comm = num(get("Comm/Fee")) || 0;
          if (base && quote && Number.isFinite(qty) && Number.isFinite(proceeds)) {
            stmt.cashFlows.push({ currency: quote, date, description: `Forex ${pair}`, amount: proceeds + comm });
            stmt.cashFlows.push({ currency: base, date, description: `Forex ${pair}`, amount: qty });
          }
          break;
        }
        if (!/Stocks|Equity/i.test(assetCategory)) break;
        const symbol = get("Symbol") ?? "";
        stmt.trades.push({
          symbol,
          currency: get("Currency") ?? "USD",
          dateTime: get("Date/Time") ?? "",
          quantity: num(get("Quantity")),
          price: num(get("T. Price")),
          proceeds: num(get("Proceeds")),
          commission: num(get("Comm/Fee")) || 0,
          basis: num(get("Basis")),
          isin: instruments.get(symbol)?.isin,
          description: instruments.get(symbol)?.description,
          exchange: instruments.get(symbol)?.exchange,
        });
        break;
      }
      case "Dividends": {
        const description = get("Description") ?? "";
        const currency = get("Currency") ?? "";
        if (!description || /Total/i.test(currency)) break;
        const amount = num(get("Amount"));
        if (!Number.isFinite(amount)) break;
        const m = description.match(/^([A-Z0-9. ]+?)\(([A-Z0-9]+)\)/);
        stmt.dividends.push({
          currency,
          date: get("Date"),
          symbol: m?.[1].trim(),
          isin: m?.[2],
          description,
          amount,
        });
        break;
      }
      case "Withholding Tax": {
        const description = get("Description") ?? "";
        const currency = get("Currency") ?? "";
        if (!description || /Total/i.test(currency)) break;
        const amount = num(get("Amount"));
        if (!Number.isFinite(amount)) break;
        const m = description.match(/^([A-Z0-9. ]+?)\(([A-Z0-9]+)\)/);
        stmt.wht.push({ currency, date: get("Date"), symbol: m?.[1].trim(), amount });
        break;
      }
      case "Open Positions": {
        if (get("DataDiscriminator") !== "Summary") break;
        const symbol = get("Symbol") ?? "";
        stmt.openPositions.push({
          symbol,
          currency: get("Currency") ?? "USD",
          quantity: num(get("Quantity")),
          costBasis: num(get("Cost Basis")),
          closePrice: num(get("Close Price")) || undefined,
          value: num(get("Value")),
          isin: instruments.get(symbol)?.isin,
          description: instruments.get(symbol)?.description,
          exchange: instruments.get(symbol)?.exchange,
        });
        break;
      }
      case "Cash Report": {
        const label = rest[0] ?? "";
        const ccyGroup = rest[1] ?? "";
        if (!/^(Starting Cash|Ending Cash|Ending Settled Cash)$/.test(label)) break;
        const amt = num(rest[2]);
        if (!Number.isFinite(amt)) break;
        stmt.cashReport.push({ label, currency: ccyGroup, amount: amt });
        break;
      }
      case "Deposits & Withdrawals": {
        const ccy = rest[0] ?? "";
        if (!ccy || /Total/i.test(ccy)) break;
        const amt = num(rest[3]);
        if (!Number.isFinite(amt)) break;
        stmt.cashFlows.push({ currency: ccy, date: rest[1], description: rest[2], amount: amt });
        break;
      }
    }
  }

  Object.assign(stmt, classifyPeriod(stmt.period));
  const srcYear = stmt.periodStart ? `'${stmt.periodStart.slice(2, 4)} file` : fileName;
  for (const t of stmt.trades) t.srcYear = srcYear;
  if (stmt.periodKind === "fy") {
    stmt.warnings.push(
      "This is an April–March (financial-year) statement. Its purchases are used, but Schedule FA needs the January–December file for year-end positions and dividends.",
    );
  }
  if (stmt.periodKind === "unknown" && stmt.trades.length + stmt.openPositions.length > 0) {
    stmt.warnings.push(`Could not read the statement period ("${stmt.period}").`);
  }
  return stmt;
}

/**
 * De-dupe trades pooled from overlapping statements. The same trade appearing
 * in TWO files (overlapping periods) collapses to one; identical fills WITHIN
 * one file (real same-second auto-invest slices) are kept — per key we keep
 * the maximum multiplicity seen in any single statement.
 */
export function dedupeTrades(statements: ParsedStatement[]): IbkrTrade[] {
  const kept = new Map<string, number>(); // key → count already emitted
  const out: IbkrTrade[] = [];
  for (const s of statements) {
    const inFile = new Map<string, number>(); // key → occurrences within THIS file
    for (const t of s.trades) {
      const key = `${t.symbol}|${t.dateTime}|${t.quantity}|${t.proceeds}`;
      const n = (inFile.get(key) ?? 0) + 1;
      inFile.set(key, n);
      if (n > (kept.get(key) ?? 0)) {
        kept.set(key, n);
        out.push(t);
      }
    }
  }
  return out;
}
