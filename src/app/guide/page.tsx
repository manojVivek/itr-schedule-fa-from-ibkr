"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Footer, Header, mono } from "@/components/chrome";

const fig: CSSProperties = { fontFamily: "var(--fig)", fontVariantNumeric: "tabular-nums" };
const eyebrow: CSSProperties = {
  ...mono,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--accent)",
};
const serif = (size: number): CSSProperties => ({
  fontFamily: "var(--display)",
  fontWeight: "var(--dispW)" as unknown as number,
  letterSpacing: "var(--dispLs)",
  fontSize: size,
  lineHeight: 1.15,
});
const card: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  borderRadius: 12,
  padding: 20,
};
const b = (t: ReactNode) => <strong style={{ fontWeight: 600, color: "var(--ink)" }}>{t}</strong>;

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ ...mono, fontSize: 10.5, color: "var(--accent)", marginBottom: 6 }}>{n}</div>
      <h2 style={{ ...serif(24), margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
  );
}

const inr = (s: string) => (
  <span style={{ ...fig, fontWeight: 600 }}>
    ₹{s}
  </span>
);

/** One line of the worked example: label · formula · result. */
function ConvRow({ label, formula, result, muted }: { label: string; formula: ReactNode; result: ReactNode; muted?: boolean }) {
  return (
    <div className="convRow">
      <div className="cLabel" style={{ ...mono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>{label}</div>
      <div className="cFormula" style={{ ...fig, fontSize: 13, color: muted ? "var(--muted)" : "var(--ink)" }}>{formula}</div>
      <div className="cResult" style={{ fontSize: 15 }}>{muted ? <span style={{ color: "var(--muted)" }}>—</span> : result}</div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--paper)", color: "var(--ink)" }}>
      <Header />

      <main style={{ flex: 1 }}>
        {/* hero */}
        <section style={{ maxWidth: 820, margin: "0 auto", padding: "52px 28px 8px" }}>
          <div style={{ ...eyebrow, marginBottom: 14 }}>Schedule FA · how the numbers are made</div>
          <h1 style={{ ...serif("clamp(28px,4.6vw,42px)" as unknown as number), margin: "0 0 16px", maxWidth: 640 }}>
            What the tool does — in plain English.
          </h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--muted)", maxWidth: 600, textWrap: "pretty" }}>
            Every figure in your workbook comes from one simple idea: convert each foreign amount to rupees using the SBI
            rate for its exact date. Here&rsquo;s the whole method, so you can check it — or do it by hand.
          </p>
        </section>

        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 28px 56px" }}>
          {/* gotchas */}
          <Section n="First" title="Two things everyone gets wrong">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div style={card}>
                <div style={{ ...mono, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>Calendar year</div>
                <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6 }}>
                  Schedule FA runs on the {b("calendar year (1 Jan – 31 Dec)")}, not the April–March financial year the rest
                  of your ITR uses. &ldquo;Schedule FA for AY 2026-27&rdquo; means everything you held during {b("calendar 2025")}.
                </p>
              </div>
              <div style={card}>
                <div style={{ ...mono, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>One row per lot</div>
                <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6 }}>
                  You report {b("one line per purchase")}, not per stock. Bought Apple 15 times? That&rsquo;s 15 rows — each
                  with its own purchase date and cost. Clubbing them hides the real acquisition dates.
                </p>
              </div>
            </div>
          </Section>

          {/* THE worked example — the centerpiece */}
          <Section n="The idea" title="Watch one lot become five numbers">
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.6, color: "var(--muted)" }}>
              Take a single purchase from your statement. Every rupee figure is that lot&rsquo;s dollars × the SBI TT-buying
              rate on the relevant date.
            </p>

            {/* input */}
            <div style={{ ...card, borderColor: "color-mix(in oklab, var(--accent) 32%, var(--rule))" }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
                Input · one purchase lot
              </div>
              <div style={{ marginTop: 8, fontSize: 15 }}>
                <strong style={{ fontWeight: 600 }}>8 Apr 2025</strong> — bought <strong style={{ fontWeight: 600 }}>10 shares of AAPL</strong> at
                $172.40 · total cost <span style={fig}>$1,725</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
                Also known about Apple in 2025: high of $259.02 on 26 Dec · price $255.60 on 31 Dec · a $0.26/share dividend on
                15 May (you held all 10) · you didn&rsquo;t sell.
              </div>
            </div>

            <div style={{ textAlign: "center", color: "var(--accent)", fontSize: 18, margin: "6px 0" }}>↓</div>

            {/* conversion */}
            <div className="convTable" style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Convert each with the TTBR for its date</div>
                <div style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>column = native × ₹rate(date)</div>
              </div>
              <ConvRow label="Initial" formula={<>$1,725 × ₹85.70 <span style={{ color: "var(--muted)" }}>(8 Apr)</span></>} result={inr("1,47,833")} />
              <ConvRow label="Peak" formula={<>10 × $259.02 × ₹89.45 <span style={{ color: "var(--muted)" }}>(26 Dec)</span></>} result={inr("2,31,693")} />
              <ConvRow label="Closing" formula={<>10 × $255.60 × ₹89.47 <span style={{ color: "var(--muted)" }}>(31 Dec)</span></>} result={inr("2,28,685")} />
              <ConvRow label="Credited" formula={<>$2.60 × ₹85.10 <span style={{ color: "var(--muted)" }}>(15 May)</span></>} result={inr("221")} />
              <ConvRow label="Proceeds" formula={<span>not sold this year</span>} result={null} muted />
            </div>

            <div style={{ textAlign: "center", color: "var(--accent)", fontSize: 18, margin: "6px 0" }}>↓</div>

            {/* output row */}
            <div style={{ ...card, background: "color-mix(in oklab, var(--accent) 6%, #FFFFFF)", borderColor: "color-mix(in oklab, var(--accent) 30%, var(--rule))" }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
                Result · one Table A3 row
              </div>
              <div style={{ marginTop: 8, ...fig, fontSize: 13, lineHeight: 1.7, textWrap: "pretty" }}>
                USA · Apple Inc (AAPL) · acquired 08/04/2025 · initial {inr("1,47,833")} · peak {inr("2,31,693")} · closing{" "}
                {inr("2,28,685")} · credited {inr("221")} · proceeds —
              </div>
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
              Then repeat for every purchase lot. A second Apple buy on 21 Nov is its own row, with its own cost and only the
              dividends paid after 21 Nov.
            </p>
          </Section>

          {/* FIFO */}
          <Section n="Sales" title="If you sold some — first in, first out">
            <div style={card}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                Foreign shares sell {b("FIFO")}: the oldest lot goes first. Say you own 25 NVDA (bought 15 Jan) and sell 5 on 3
                Oct. The sale hits that lot, so it now shows:
              </p>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[
                  ["Remaining", "20 shares → drive the closing value"],
                  ["Proceeds", "5 × $188.40 × ₹rate(3 Oct)"],
                  ["Initial & Peak", "unchanged — still for all 25 while held"],
                ].map(([k, v]) => (
                  <div key={k} style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>{k}</div>
                    <div style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.5 }}>{v}</div>
                  </div>
                ))}
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
                A lot sold {b("entirely")} during the year still gets a row — closing {inr("0")}, with its sale in proceeds.
              </p>
            </div>
          </Section>

          {/* subtleties */}
          <Section n="The tricky bits" title="Two subtleties worth knowing">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <div style={card}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Peak is a daily maximum</div>
                <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
                  The peak is in rupees, and both the price {b("and")}{" "}the rate move daily. The highest ₹ value can land on
                  a day the price was slightly below its high but the rupee was weaker. So it&rsquo;s the max of{" "}
                  <span style={fig}>price × that day&rsquo;s rate</span> across all ~250 days — which is why a tool helps.
                </p>
              </div>
              <div style={card}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>The stock-split trap</div>
                <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
                  Free price feeds often show {b("split-adjusted")}{" "}history. If a stock split 4-for-1, its past prices are
                  divided by 4 — so a naive peak comes out wrong. The fix: anchor the feed to your broker&rsquo;s own 31-Dec
                  close. This tool does it automatically.
                </p>
              </div>
            </div>
          </Section>

          {/* A2 */}
          <Section n="Table A2" title="The account itself — just the cash">
            <div style={card}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                Table A3 is your securities. Table A2 is the {b("broker account")}, and it wants the {b("un-invested cash")} —
                not the securities again.
              </p>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
                <li>{b("Closing")} = the account&rsquo;s ending cash on 31 Dec × 31-Dec rate.</li>
                <li>{b("Peak")} = walk the ledger day by day (deposits + sales + dividends − buys − fees), track the highest ₹ the running balance hit.</li>
                <li>{b("Credited")} = all dividends/interest, each at its own date&rsquo;s rate.</li>
              </ul>
            </div>
          </Section>

          {/* mistakes */}
          <Section n="Watch out" title="Common mistakes">
            <div style={{ ...card, padding: "8px 20px" }}>
              {[
                "Using the April–March financial year — Schedule FA is calendar year.",
                "Reporting the Jan-1 opening balance as a purchase — report lots at their real buy dates.",
                "One row per stock — it's one row per purchase lot.",
                "A single average FX rate for the year — each date gets its own TTBR.",
                "Putting securities into Table A2 — A2 is cash only.",
                "Guessing an old lot's date or cost — get the earlier year's statement, never estimate.",
              ].map((t) => (
                <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid color-mix(in oklab, var(--rule) 60%, #FFFFFF)" }}>
                  <span style={{ color: "#A23A26", fontWeight: 700, fontSize: 13, flex: "none", marginTop: 1 }}>✗</span>
                  <span style={{ fontSize: 13, lineHeight: 1.55 }}>{t}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* CTA */}
          <div style={{ marginTop: 48, ...card, textAlign: "center", padding: "28px 24px" }}>
            <div style={{ ...serif(22), marginBottom: 8 }}>That&rsquo;s the whole method.</div>
            <p style={{ margin: "0 auto 18px", maxWidth: 460, fontSize: 14, lineHeight: 1.6, color: "var(--muted)" }}>
              The tool does exactly this for every lot — per-date TTBR, daily-max peak, FIFO, dividend attribution, the cash
              account — and writes the ready-to-file workbook. Do it by hand to verify; let the tool do it to save the ~250
              multiplications per lot.
            </p>
            <Link
              href="/"
              style={{ display: "inline-block", background: "var(--accent)", color: "#FCFBF8", fontSize: 14, fontWeight: 600, padding: "11px 22px", borderRadius: 9, textDecoration: "none" }}
            >
              Build your Schedule FA →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
