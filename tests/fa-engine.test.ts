import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { dedupeTrades, parseIbkrStatement } from "@/lib/parse-ibkr";
import { buildScheduleFa } from "@/lib/fa-engine";
import { PriceTable, TtbrTable, type RateMap } from "@/lib/rates-store";
import { buildWorkbook } from "@/lib/xlsx-export";

const fixture = fs.readFileSync(path.join(__dirname, "fixtures/synthetic-2025.csv"), "utf8");

// synthetic TTBR: known values on the fixture's key dates
const RATES: RateMap = {
  USD: {
    "2025-01-02": 85,
    "2025-05-01": 85.8,
    "2025-06-30": 86,
    "2025-07-15": 86.5,
    "2025-08-01": 86,
    "2025-09-30": 87,
    "2025-12-31": 88,
  },
  GBP: { "2025-05-01": 105, "2025-12-31": 106 },
};

// price feed deliberately at HALF the broker's level (split-factor test):
// broker Dec-31 close = 130, feed Dec-31 = 65 → anchor ×2 must cancel it.
const PRICES = {
  AAA: { "2025-08-01": 70, "2025-12-31": 65 },
};

describe("IBKR statement parser", () => {
  const stmt = parseIbkrStatement(fixture, "synthetic-2025.csv");

  it("reads account, period, sections", () => {
    expect(stmt.account).toBe("U1234567");
    expect(stmt.periodKind).toBe("cy");
    expect(stmt.periodStart).toBe("2025-01-01");
    expect(stmt.trades).toHaveLength(3); // 2 buys + 1 sell (forex → cash flows)
    expect(stmt.dividends).toHaveLength(1);
    expect(stmt.wht).toHaveLength(1);
    expect(stmt.openPositions).toHaveLength(2);
    // forex legs became two cash flows + one deposit
    expect(stmt.cashFlows).toHaveLength(3);
    expect(stmt.cashReport.filter((r) => r.currency === "USD")).toHaveLength(2);
  });

  it("dedupes identical trades across overlapping files", () => {
    const twice = [stmt, parseIbkrStatement(fixture, "copy.csv")];
    expect(dedupeTrades(twice)).toHaveLength(3);
  });
});

describe("Schedule FA engine", () => {
  const stmt = parseIbkrStatement(fixture, "synthetic-2025.csv");
  const res = buildScheduleFa([stmt], 2025, new TtbrTable(RATES), new PriceTable(PRICES));

  it("builds FIFO tranches with the sell against the earliest lot", () => {
    expect(res.a3).toHaveLength(2);
    const [lot1, lot2] = res.a3;
    // lot 1: 10 @ 2025-01-02, basis 1000 → initial 1000×85
    expect(lot1.dateAcquired).toBe("2025-01-02");
    expect(lot1.initialInr).toBe(85000);
    // sell of 6 hits lot 1 only: remaining 4 → closing 4×130×88
    expect(lot1.closingInr).toBe(Math.round(4 * 130 * 88));
    expect(lot1.saleNote).toContain("6 sold 2025-09-30");
    // proceeds: 6 × (720/6) × TTBR(2025-09-30)=87
    expect(lot1.grossProceedsInr).toBe(Math.round(720 * 87));
    // lot 2 untouched: 5 units → closing 5×130×88
    expect(lot2.dateAcquired).toBe("2025-06-30");
    expect(lot2.initialInr).toBe(Math.round(600 * 86));
    expect(lot2.closingInr).toBe(Math.round(5 * 130 * 88));
  });

  it("anchors the daily peak to the broker close (split-proof)", () => {
    // feed 2025-08-01=70 at anchor 130/65=2 → effective price 140, TTBR 86
    const [lot1, lot2] = res.a3;
    expect(lot1.peakInr).toBe(Math.round(10 * 140 * 86));
    expect(lot2.peakInr).toBe(Math.round(5 * 140 * 86));
  });

  it("attributes the dividend to lots held on the pay date, by units", () => {
    const [lot1, lot2] = res.a3;
    // 15 USD on 2025-07-15 (rate 86.5) split 10:5 across lots (both held)
    expect(lot1.grossPaidInr).toBe(Math.round((15 * 86.5 * 10) / 15));
    expect(lot2.grossPaidInr).toBe(Math.round((15 * 86.5 * 5) / 15));
  });

  it("flags holdings without purchase history and excludes them", () => {
    expect(res.uncovered).toHaveLength(1);
    expect(res.uncovered[0].symbol).toBe("BBB");
    expect(res.a3.some((r) => r.symbol === "BBB")).toBe(false);
    expect(res.warnings.some((w) => w.includes("BBB"))).toBe(true);
  });

  it("reconciles covered closings against the year-end portfolio", () => {
    // covered = AAA only: position value 1170 × 88
    expect(res.reconciliation.expectedClosingInr).toBe(Math.round(1170 * 88));
    expect(res.reconciliation.actualClosingInr).toBe(Math.round(9 * 130 * 88));
    expect(res.reconciliation.ok).toBe(true);
  });

  it("reconstructs the custodial cash and dividend rollup", () => {
    expect(res.a2).not.toBeNull();
    expect(res.a2!.accountNumber).toBe("U1234567");
    // ending cash: USD 1099.25×88 + GBP 100×106
    expect(res.a2!.closingInr).toBe(Math.round(1099.25 * 88 + 100 * 106));
    expect(res.a2!.incomes["Dividend"]).toBe(Math.round(15 * 86.5));
    // peak: right after the 2000 deposit on 01-02, before the same-day buy settles later in the ledger
    expect(res.a2!.peakInr).toBe(Math.round(2100 * 85));
    expect(res.a2!.peakDate).toBe("2025-01-02");
  });

  it("builds the 3-sheet workbook", () => {
    const wb = buildWorkbook(res);
    expect(wb.SheetNames).toEqual(["Schedule FA - Table A3", "Schedule FA - Table A2", "Methodology"]);
  });
});

describe("golden vs tax-helper (env-gated, real statements)", () => {
  const dir = process.env.IBKR_REAL_DOCS;
  const available = !!dir && fs.existsSync(dir);

  it.skipIf(!available)("reproduces the filed AY 2026-27 numbers", async () => {
    const cy = parseIbkrStatement(fs.readFileSync(path.join(dir!, "ibkr/activity_statement_2025_2025.csv"), "utf8"), "2025.csv");
    const y24 = parseIbkrStatement(
      fs.readFileSync(path.join(dir!, "ibkr/activity-statement-U15602290_2024_2024.csv"), "utf8"),
      "2024.csv",
    );
    // real TTBR from the bundled JSONs
    const rates: RateMap = { USD: {}, GBP: {} };
    for (const y of [2024, 2025]) {
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, `../public/data/ttbr/${y}.json`), "utf8")) as RateMap;
      for (const ccy of Object.keys(data)) rates[ccy] = { ...rates[ccy], ...data[ccy] };
    }
    // real daily prices CSV (same file tax-helper used)
    const priceCsv = fs.readFileSync(path.join(dir!, "security-prices-2025.csv"), "utf8").trim().split("\n").slice(1);
    const prices: Record<string, Record<string, number>> = {};
    for (const line of priceCsv) {
      const [d, sym, close] = line.split(",");
      (prices[sym] ??= {})[d] = Number(close);
    }

    const res = buildScheduleFa([cy, y24], 2025, new TtbrTable(rates), new PriceTable(prices));
    expect(res.a3).toHaveLength(853);
    expect(res.totals.closingInr).toBe(1367874);
    expect(res.totals.dividendsInr).toBe(11081);
    expect(res.a2!.peakInr).toBe(200246);
    expect(res.a2!.closingInr).toBe(45273);
    expect(res.reconciliation.ok).toBe(true);
    // VUAG 2025-09-09: basis 352.99 GBP at TTBR 118.00
    const vuag = res.a3.find((r) => r.symbol === "VUAG" && r.dateAcquired === "2025-09-09")!;
    expect(vuag.initialInr).toBe(Math.round(352.99 * 118));
  });
});
