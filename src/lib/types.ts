/** Plain parsed rows from an IBKR Activity Statement CSV — no framework baggage. */

export interface IbkrTrade {
  symbol: string;
  currency: string;
  dateTime: string; // "2025-09-09, 11:24:25" (IBKR format)
  quantity: number; // + buy, − sell
  price: number;
  proceeds: number; // − on buys, + on sells
  commission: number;
  basis: number;
  isin?: string;
  description?: string;
  exchange?: string;
  /** which uploaded statement this trade came from (year label for the UI badge) */
  srcYear?: string;
}

export interface DividendRow {
  symbol?: string;
  isin?: string;
  currency: string;
  date?: string;
  description: string;
  amount: number;
}

export interface WhtRow {
  symbol?: string;
  currency: string;
  date?: string;
  amount: number; // negative = tax withheld
}

export interface OpenPosition {
  symbol: string;
  currency: string;
  quantity: number;
  costBasis: number;
  closePrice?: number;
  value: number;
  isin?: string;
  description?: string;
  exchange?: string;
}

export interface CashReportRow {
  label: string; // "Starting Cash" | "Ending Cash" | …
  currency: string; // "USD" | "GBP" | "Base Currency Summary"
  amount: number;
}

export interface CashFlow {
  date?: string;
  currency: string;
  description?: string;
  amount: number;
}

export interface ParsedStatement {
  fileName: string;
  account: string;
  period: string; // raw, e.g. "January 1, 2025 - December 31, 2025"
  periodStart?: string; // ISO
  periodEnd?: string; // ISO
  periodKind: "cy" | "fy" | "custom" | "unknown";
  trades: IbkrTrade[];
  dividends: DividendRow[];
  wht: WhtRow[];
  openPositions: OpenPosition[];
  cashReport: CashReportRow[];
  cashFlows: CashFlow[];
  warnings: string[];
}

/** One Schedule FA Table A3 row (per purchase lot). */
export interface FaA3Row {
  symbol: string;
  units: number;
  unitPriceNative: number;
  currency: string;
  acqTtbr: number;
  srcYear?: string;
  saleNote?: string;
  countryName: string;
  countryCode: string;
  entityName: string;
  address: string;
  zip: string;
  natureOfEntity: string;
  dateAcquired?: string;
  initialInr: number;
  peakInr: number;
  closingInr: number;
  grossPaidInr: number;
  grossProceedsInr: number;
  note?: string;
}

/** Schedule FA Table A2 (foreign custodial account). */
export interface FaA2Row {
  countryName: string;
  countryCode: string;
  institution: string;
  address: string;
  zip: string;
  accountNumber: string;
  status: string;
  openingDate?: string;
  peakInr: number;
  peakDate?: string;
  closingInr: number;
  incomes: Record<string, number>; // nature → INR
}

export interface Reconciliation {
  /** Σ year-end positions × 31-Dec TTBR (what the account is worth) */
  expectedClosingInr: number;
  /** Σ per-tranche closing values (what the rows disclose) */
  actualClosingInr: number;
  ok: boolean;
}

export interface FaResult {
  faYear: number;
  a3: FaA3Row[];
  a2: FaA2Row | null;
  warnings: string[];
  /** symbols held at 31-Dec with no purchase history in the uploaded files */
  uncovered: { symbol: string; quantity: number; valueNative: number; currency: string }[];
  reconciliation: Reconciliation;
  stats: { tranches: number; securities: number; withDailyPeak: number; ttbrFallbacks: number; peakFallbacks: number };
  totals: { initialInr: number; peakInr: number; closingInr: number; dividendsInr: number; proceedsInr: number };
}
