# How to build Schedule FA from IBKR statements — by hand

A plain-English walkthrough of exactly what this tool does, so you can check it,
trust it, or do it manually if you prefer. No jargon assumed. Worked examples use
made-up-but-realistic numbers.

> This is a preparation guide, not tax advice. When in doubt, ask your CA.

---

## 1. What Schedule FA is (in one paragraph)

If you're an Indian resident and you held any foreign asset — say US stocks
through Interactive Brokers — you must **disclose** each one in **Schedule FA**
of your ITR. It is a *disclosure of what you held*, not a tax calculation. The
tax on your gains/dividends is handled elsewhere in the return; Schedule FA just
lists the assets and a few values for each.

Two things trip everyone up:

1. **It runs on the calendar year (1 Jan – 31 Dec), not the April–March financial
   year** the rest of your ITR uses. So "Schedule FA for AY 2026-27" means
   "everything you held during **calendar 2025**."
2. **You report one line per *purchase lot*, not one line per stock.** If you
   bought Apple 15 times, that's 15 lines — each with its own purchase date and
   cost. (This is the safe, standard reading; clubbing them understates the
   "initial value" and hides the real acquisition dates.)

There are two tables:

- **Table A3** — every equity/ETF holding, one row per purchase lot.
- **Table A2** — the custodial account itself (the broker), reporting the
  **un-invested cash** balance and the income credited.

---

## 2. The five numbers you need for each lot (Table A3)

For one purchase lot, you fill in five money columns, **all in rupees**:

| Column | Plain meaning |
|---|---|
| **Initial value** | What you paid for this lot, in ₹ **on the day you bought it** |
| **Peak value** | The highest ₹ value this lot reached at any point during the year |
| **Closing value** | What this lot was worth on **31 December** (or ₹0 if you'd sold it) |
| **Gross amount credited** | Dividends this lot earned during the year, in ₹ |
| **Gross proceeds** | If you sold it, the sale amount in ₹ (else blank) |

Everything hinges on **converting US$ (or £) to ₹ using the right exchange rate
for the right date.**

---

## 3. The exchange rate: SBI TTBR

Use the **State Bank of India Telegraphic Transfer Buying Rate (TTBR)** — the
rate SBI publishes each working day for buying foreign currency. This is the
accepted rate for foreign-asset valuation.

- One rate **per day per currency** (USD/INR, GBP/INR).
- SBI only publishes on **working days**. For a Saturday/Sunday/holiday, use the
  **previous working day's** rate.
- Where to get them: SBI publishes a daily "FOREX CARD RATES" sheet; the "**TT
  BUY**" column is the one you want. A community archive of every day's sheet
  lives at
  [github.com/skbly7/sbi-tt-rates-historical](https://github.com/skbly7/sbi-tt-rates-historical).
  (This tool ships those rates as small bundled tables so you don't have to
  fetch them.)

---

## 4. Worked example — one Apple lot, start to finish

Say your IBKR statement shows this buy:

> **8 April 2025** — bought **10 shares of AAPL at $172.40**, total cost
> **$1,725** (that's 10 × $172.40 = $1,724 plus a $1 commission).

And these facts about Apple over 2025:

- Its highest closing price in the year was **$259.02 on 26 Dec 2025**.
- Its price on 31 Dec 2025 was **$255.60**.
- It paid a dividend of **$0.26/share on 15 May 2025** (you held all 10, so you
  got 10 × $0.26 = **$2.60**).
- You still held all 10 shares at year-end (didn't sell).

Look up the SBI USD/INR TTBR for each date:

| Date | Why | TTBR (USD/INR) |
|---|---|---|
| 8 Apr 2025 | purchase | 85.70 |
| 15 May 2025 | dividend paid | 85.10 |
| 26 Dec 2025 | year's high | 89.45 |
| 31 Dec 2025 | year-end | 89.47 |

Now compute each column:

**Initial value** = cost × TTBR on the purchase date
= `$1,725 × 85.70` = **₹1,47,833**

**Peak value** = shares × highest daily price × TTBR **on that day**
= `10 × $259.02 × 89.45` = **₹2,31,693**
*(Important: it's the highest of `price × that day's rate` across the year, not
the highest price times some other day's rate. See §7.)*

**Closing value** = shares held on 31 Dec × 31-Dec price × 31-Dec TTBR
= `10 × $255.60 × 89.47` = **₹2,28,685**

**Gross amount credited** = dividend × TTBR on the pay date
= `$2.60 × 85.10` = **₹221**

**Gross proceeds** = you didn't sell → **blank (₹0)**

So this one lot's Table A3 row is:

| Country | Entity | Acquired | Initial ₹ | Peak ₹ | Closing ₹ | Credited ₹ | Proceeds ₹ |
|---|---|---|---|---|---|---|---|
| USA | Apple Inc (AAPL) | 08/04/2025 | 1,47,833 | 2,31,693 | 2,28,685 | 221 | — |

Repeat for **every** purchase lot. If you bought Apple again on 21 Nov 2025,
that's a **second row** with its own purchase date, its own initial value, and
its own share of any dividends paid *after* 21 Nov.

---

## 5. If you sold some shares (FIFO)

Foreign shares are sold **First-In-First-Out**: the oldest lot goes first.

Example — you own two NVDA lots and sell 5 shares:

- Lot A: 25 sh bought 15 Jan 2025
- (no other lots)
- **Sold 5 sh on 3 Oct 2025 at $188.40**

The sale hits **Lot A** (oldest). So:

- Lot A now has **20 shares remaining** for the closing value.
- Lot A's **proceeds** column = `5 × $188.40 × TTBR(3 Oct)`.
- Lot A's **closing** = `20 × (31-Dec price) × TTBR(31 Dec)`.
- The lot still keeps its **initial value** (what you paid for all 25) and its
  **peak** (computed on the full 25 while you held them).

A lot you sold **entirely** during the year still gets a row (you held it part of
the year), with closing = **₹0** and its sale in the proceeds column.

---

## 6. Table A2 — the custodial account (the cash)

Table A3 covers your *securities*. Table A2 covers the **broker account itself**,
and the number it wants is the **un-invested cash** — not the securities again.

- **Closing balance** = the cash sitting in the account on 31 Dec × 31-Dec TTBR.
  (Your statement's "Ending Cash" line, per currency.)
- **Peak balance** = the highest the *cash* balance reached during the year, in ₹.
  You get this by walking the account ledger day by day: start with the opening
  cash, then add every deposit, every sale, every dividend, and subtract every
  purchase, commission and tax — and note the highest ₹ value the running balance
  hit. (Cash usually peaks right after a big deposit, before you invested it.)
- **Gross amount credited** = total dividends/interest credited to the account,
  each converted at its own date's TTBR.

Multi-currency note: if you also hold £ (e.g. an LSE-listed ETF), IBKR converts
$ → £ with a **forex trade**. That conversion moves cash between currencies and
must be included in the running balance, or your peak will be wrong.

---

## 7. Two subtleties worth understanding

**Why "peak" is a daily maximum, not just the highest price.** The peak is in
*rupees*, and both the share price *and* the exchange rate move every day. The
highest ₹ value might land on a day when the price was slightly below its high
but the rupee was weaker. So the correct method is: for **every** day you held
the lot, compute `units × that day's price × that day's TTBR`, and take the
maximum. Doing it by hand for one lot means ~250 multiplications — which is
exactly why a tool helps.

**The stock-split trap.** Free price feeds often give **split-adjusted** history —
if a stock split 4-for-1, all its *past* prices are divided by 4. If your
statement shows the un-split price but the feed shows the adjusted one, your peak
comes out 4× too small (or large). The safe fix: anchor the feed to your broker's
**own reported 31-Dec close** — use the feed only for the *shape* (how each day
compares to 31-Dec), not the absolute level. This tool does that automatically;
by hand, just be alert if a security had a split during the year.

---

## 8. Common mistakes to avoid

- ❌ Using the **financial year** (Apr–Mar). Schedule FA is **calendar year**.
- ❌ Reporting the **Jan-1 opening balance** as if it were a purchase. You report
  *lots at their original purchase dates*, not the year-open snapshot.
- ❌ One row per stock. It's **one row per purchase lot**.
- ❌ Using a single average exchange rate for the year. Each date gets **its own**
  TTBR.
- ❌ Putting the securities' value into Table **A2**. A2 is the **cash** only;
  the securities are in A3.
- ❌ Guessing an acquisition date/cost for an old lot. If the buy isn't in your
  statements, get the **earlier year's** statement — never estimate.

---

## 9. …or just use the tool

Everything above — per-lot conversion at the right daily TTBR, the daily-max
peak, FIFO, dividend attribution, the cash reconstruction, the split anchoring —
is what this app does in your browser, and it writes the ready-to-file workbook
(Table A3, Table A2, and a Methodology sheet documenting every figure). The
manual method is here so you can **verify** it, not because you have to do it by
hand.
