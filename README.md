# ITR Schedule FA Helper — IBKR → Schedule FA

Turn raw **Interactive Brokers** Activity Statements into a filing-ready Indian
**Schedule FA** (Foreign Assets) workbook — per-tranche Table A3 at the correct
daily **SBI TTBR**, computed **entirely in your browser**.

Ready-made Schedule FA workbooks exist inside platforms like Vested/INDmoney for
their own accounts. IBKR just gives you raw CSVs. This tool closes that gap for
IBKR investors, to the Black-Money-Act "tranche-level" standard.

> **Not tax advice.** It assists disclosure preparation — review the output with
> your CA.

## What it does

- **One row per purchase lot** (tranche-level), FIFO for sales — the standard
  the ₹10 lakh non-disclosure penalty makes you want to get right.
- **Initial value** = lot cost × SBI TT buying rate **on the acquisition date**.
- **Peak value** = daily maximum over the held window of `units × close × TTBR`,
  anchored to the broker's own 31-Dec close (so split-adjusted price feeds can't
  distort the level).
- **Closing** = units held on 31-Dec × 31-Dec close × 31-Dec TTBR.
- **Dividends** attributed to the lots held on each pay date, at the pay-date TTBR.
- **Table A2** custodial account: the un-invested cash (reconstructed from the
  statement's ledger, forex conversions included) + the income rollup.
- **Reconciliation badge**: Σ per-lot closings must equal the year-end portfolio.
- Downloads a `.xlsx` with **Table A3**, **Table A2**, and a **Methodology** sheet
  (every number explained — rates, dates, sources), plus an on-screen preview.

## Privacy

**Your statement never leaves your browser.** Parsing and every ₹ computation run
in-tab. The only network request is a list of **ticker symbols** sent to a small
`/api/prices` proxy that fetches public end-of-day closes (Yahoo) — no amounts,
no account numbers, no analytics. SBI TTBR tables ship as static JSON in the app.

## Inputs

1. **IBKR Activity Statement CSV** for the FA calendar year (1 Jan – 31 Dec) —
   required. In IBKR: *Performance & Reports → Statements → Activity*, set **Period → Annual**, **Date → the year**, then **Download CSV**.
2. **Prior-year Activity Statements** — only needed when holdings you still owned
   at year-end were bought earlier. Schedule FA needs each lot's **original**
   purchase date and cost, which only that year's statement has. The app detects
   exactly which year is missing and asks for it; unresolved lots are **excluded**
   from the workbook (never estimated).

## How it works

Want to understand or verify the computation — or do it by hand? See
**[docs/how-schedule-fa-is-computed.md](docs/how-schedule-fa-is-computed.md)** — a plain-English
walkthrough with worked examples (per-lot TTBR conversion, daily-max peak, FIFO, the cash account).

## Develop

```bash
npm install
npm run dev            # http://localhost:3000 — click "Load sample statements"
npm test               # unit tests on a synthetic fixture
npm run build
```

Refresh the bundled SBI TTBR tables (dev-only, needs network):

```bash
node scripts/fetch-ttbr.mjs 2025 > public/data/ttbr/2025.json
```

Golden check against a known-good real filing (statements never committed):

```bash
IBKR_REAL_DOCS=/path/to/your/statements npm test
```

## Deploy

Zero-config on Vercel — one static page plus the `/api/prices` edge proxy.
`data/` and `*.csv` are gitignored so real statements can never be committed.

## Stack

Next.js · React · TypeScript · Tailwind (IBM Plex) · SheetJS (`xlsx`) ·
papaparse. TTBR archive: [skbly7/sbi-tt-rates-historical](https://github.com/skbly7/sbi-tt-rates-historical).

MIT.
