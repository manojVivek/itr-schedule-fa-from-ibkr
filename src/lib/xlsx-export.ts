/**
 * Schedule-FA-<year>.xlsx — three sheets:
 *   1. "Schedule FA - Table A3": one row per purchase lot (13 columns)
 *   2. "Schedule FA - Table A2": the custodial account, stacked income rows
 *   3. "Methodology": how every number was computed — CA-review-ready
 * Runs entirely in the browser (SheetJS).
 */

import * as XLSX from "xlsx";
import type { FaResult } from "@/lib/types";

const A3_HEADER = [
  "Sl No",
  "Country/Region name",
  "Country code",
  "Name of entity",
  "Address of entity",
  "ZIP code",
  "Nature of entity",
  "Date of acquiring the interest",
  "Initial value of the investment (INR)",
  "Peak value of investment during the period (INR)",
  "Closing balance (INR)",
  "Total gross amount paid/credited with respect to the holding during the period (INR)",
  "Total gross proceeds from sale or redemption of investment during the period (INR)",
];

const A2_HEADER = [
  "Sl No",
  "Country/Region name",
  "Country code",
  "Name of financial institution",
  "Address of institution",
  "ZIP code",
  "Account number",
  "Status",
  "Account opening date",
  "Peak balance during the period (INR)",
  "Closing balance (INR)",
  "Nature of amount credited",
  "Gross amount credited (INR)",
];

function dmy(isoDate?: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function buildWorkbook(result: FaResult): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Table A3 ──
  const a3rows: (string | number)[][] = [
    [`Schedule FA — Table A3: Details of Foreign Equity and Debt Interest (calendar year ${result.faYear})`],
    [],
    A3_HEADER,
    ...result.a3.map((r, i) => [
      i + 1,
      r.countryName,
      r.countryCode,
      r.entityName,
      r.address,
      r.zip,
      r.natureOfEntity,
      dmy(r.dateAcquired),
      r.initialInr,
      r.peakInr,
      r.closingInr,
      r.grossPaidInr,
      r.grossProceedsInr,
    ]),
    [],
    [
      "",
      "",
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      result.totals.initialInr,
      result.totals.peakInr,
      result.totals.closingInr,
      result.a3.reduce((s, r) => s + r.grossPaidInr, 0),
      result.a3.reduce((s, r) => s + r.grossProceedsInr, 0),
    ],
  ];
  const wsA3 = XLSX.utils.aoa_to_sheet(a3rows);
  wsA3["!cols"] = [6, 24, 9, 42, 40, 10, 38, 14, 16, 16, 16, 18, 18].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, wsA3, "Schedule FA - Table A3");

  // ── Sheet 2: Table A2 ──
  const a2 = result.a2;
  const incomeEntries = a2 ? Object.entries(a2.incomes).filter(([, v]) => v > 0) : [];
  const a2rows: (string | number)[][] = [
    [`Schedule FA — Table A2: Details of Foreign Custodial Accounts (calendar year ${result.faYear})`],
    [],
    A2_HEADER,
    ...(a2
      ? (incomeEntries.length ? incomeEntries : [["—", 0] as [string, number]]).map(([nature, amount], i) =>
          i === 0
            ? [1, a2.countryName, a2.countryCode, a2.institution, a2.address, a2.zip, a2.accountNumber, a2.status, a2.openingDate ?? "", a2.peakInr, a2.closingInr, nature, amount]
            : ["", "", "", "", "", "", "", "", "", "", "", nature, amount],
        )
      : [["", "No calendar-year statement provided — Table A2 unavailable"]]),
  ];
  const wsA2 = XLSX.utils.aoa_to_sheet(a2rows);
  wsA2["!cols"] = [6, 24, 9, 26, 42, 10, 14, 14, 16, 18, 16, 40, 16].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, wsA2, "Schedule FA - Table A2");

  // ── Sheet 3: Methodology ──
  const m: (string | number)[][] = [
    ["Methodology — how this Schedule FA was computed"],
    [],
    ["Generated", new Date().toISOString().slice(0, 10)],
    ["Scope", `FA year ${result.faYear} = calendar year 01/01/${result.faYear} – 31/12/${result.faYear}; one row per purchase lot (tranche-level), FIFO for sales`],
    [],
    ["Column", "Formula / source"],
    ["Initial value", "Native cost basis of the lot (incl. commission) × SBI TT buying rate on the acquisition date"],
    [
      "Peak value",
      "Maximum over every day the lot was held in the year of: units × that day's close price × that day's SBI TTBR. Daily closes come from a public price feed anchored to the broker's own 31-Dec close (scale-invariant, split-proof); when no daily series exists, peak falls back to max(initial, closing).",
    ],
    ["Closing balance", "Units still held on 31-Dec × broker-reported 31-Dec close × 31-Dec TTBR (zero if the lot was sold in-year)"],
    ["Gross amount credited", "Each dividend payout attributed to the lots held on its pay date, at the pay-date TTBR (gross, before withholding)"],
    ["Gross proceeds", "Sale proceeds allocated FIFO to lots, at the sale-date TTBR"],
    ["Custodial account (A2)", "Un-invested cash only (securities are disclosed per-lot in A3): running per-currency balance from starting cash + every dated flow (deposits, trades, dividends, withholding, forex conversions); peak = max daily INR value, closing = broker-reported ending cash"],
    [],
    ["Rate source", "SBI Telegraphic Transfer Buying Rate, daily (SBI forex card rate sheets; archive: github.com/skbly7/sbi-tt-rates-historical). Non-working days use the previous working day's rate."],
    ["Price source", "Public end-of-day closes fetched by ticker symbol only — no account data leaves the browser."],
    ["TTBR fallbacks", result.stats.ttbrFallbacks === 0 ? "None — every conversion used a dated rate" : `${result.stats.ttbrFallbacks} conversions fell back to the nearest available rate (date outside the bundled rate tables)`],
    ["Daily-peak coverage", `${result.stats.withDailyPeak} of ${result.stats.tranches} lots scanned against full daily series${result.stats.peakFallbacks ? `; ${result.stats.peakFallbacks} used max(initial, closing)` : ""}`],
    [
      "Exclusions",
      result.uncovered.length === 0
        ? "None — every year-end lot has verified acquisition history."
        : `${result.uncovered.map((u) => u.symbol).join(", ")} (held at 31-Dec) lack acquisition history in the provided statements and are EXCLUDED — values are never estimated. Add the earlier Activity Statement and regenerate.`,
    ],
    [],
    ["Reconciliation", `Sum of per-lot closing values ₹${result.reconciliation.actualClosingInr.toLocaleString("en-IN")} vs year-end portfolio at 31-Dec TTBR ₹${result.reconciliation.expectedClosingInr.toLocaleString("en-IN")} — ${result.reconciliation.ok ? "MATCHED" : "GAP (see warnings)"}`],
    [],
    ...(result.warnings.length ? [["Warnings"], ...result.warnings.map((w) => ["", w])] : [["Warnings", "None"]]),
    [],
    ["Privacy", "Computed entirely in the browser; the statement never left this device. Only ticker symbols were sent to fetch public daily prices."],
    ["Disclaimer", "This tool assists disclosure preparation; verify with your tax professional. It is not tax advice."],
  ];
  const wsM = XLSX.utils.aoa_to_sheet(m);
  wsM["!cols"] = [{ wch: 26 }, { wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsM, "Methodology");

  return wb;
}

export function downloadWorkbook(result: FaResult): void {
  const wb = buildWorkbook(result);
  XLSX.writeFile(wb, `Schedule-FA-${result.faYear}.xlsx`, { compression: true });
}
