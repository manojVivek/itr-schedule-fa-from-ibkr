"use client";

import { useRef, type DragEvent } from "react";
import { mono } from "@/components/chrome";

export function Landing({
  year,
  onYear,
  onFiles,
  onDemo,
}: {
  year: number;
  onYear: (y: number) => void;
  onFiles: (files: FileList | File[]) => void;
  onDemo: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ay = `AY ${year + 1}-${String(year + 2).slice(2)}`;

  const seg = (sel: boolean): React.CSSProperties => ({
    padding: "7px 16px",
    fontSize: 12.5,
    fontWeight: sel ? 600 : 500,
    border: "none",
    cursor: "pointer",
    background: sel ? "var(--ink)" : "transparent",
    color: sel ? "#FBFAF7" : "var(--muted)",
  });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  return (
    <main style={{ flex: 1 }}>
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "56px 28px 32px" }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 16 }}>
          Indian ITR-2 / ITR-3 · Schedule FA
        </div>
        <h1
          style={{
            margin: "0 0 16px",
            fontFamily: "var(--display)",
            fontWeight: "var(--dispW)" as unknown as number,
            letterSpacing: "var(--dispLs)",
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 1.14,
            maxWidth: 680,
          }}
        >
          Your IBKR statements, turned into a filing-ready Schedule FA.
        </h1>
        <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.55, color: "var(--muted)", maxWidth: 600, textWrap: "pretty" }}>
          Per-tranche Table A3 at the correct daily SBI TTBR — computed entirely in your browser. Drop your Activity
          Statements, download the workbook your CA expects.
        </p>
      </section>

      <section style={{ maxWidth: 880, margin: "0 auto", padding: "0 28px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(29,27,22,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>FA year</span>
              <div style={{ display: "inline-flex", border: "1px solid var(--rule)", borderRadius: 8, overflow: "hidden" }}>
                <button style={seg(year === 2024)} onClick={() => onYear(2024)}>
                  2024
                </button>
                <button style={seg(year === 2025)} onClick={() => onYear(2025)}>
                  2025
                </button>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              01 Jan – 31 Dec {year} · filed in {ay}
            </span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", marginBottom: 18, textWrap: "pretty" }}>
            Schedule FA is disclosed on a <strong style={{ color: "var(--ink)", fontWeight: 600 }}>calendar-year</strong>{" "}basis
            (Jan–Dec) — unlike the rest of the ITR, which uses the April–March financial year. Pick the calendar year you&rsquo;re
            reporting; it goes into that year&rsquo;s return ({ay}).
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="hoverDrop"
            style={{
              border: "1.5px dashed color-mix(in oklab, var(--ink) 26%, #FFFFFF)",
              borderRadius: 10,
              padding: "42px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color .15s, background .15s",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid var(--rule)",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                color: "var(--accent)",
              }}
            >
              ↓
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop your IBKR Activity Statement CSVs</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
              Multiple files welcome — the {year} statement is required; prior years cover older lots
            </div>
            <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 18 }}>↓ New to this? See how to download them from IBKR below</div>
            <span
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "#FCFBF8",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 8,
              }}
            >
              Upload statements
            </span>
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
              or{" "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDemo();
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                  fontSize: 12,
                  color: "var(--accent)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                try it with sample data
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div style={{ marginTop: 16, background: "var(--soft)", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              How to get the statement from IBKR
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "var(--ink)" }}>
              <li>
                In IBKR Client Portal, open{" "}
                <strong style={{ fontWeight: 600 }}>Performance &amp; Reports → Statements → Activity</strong>.
              </li>
              <li>
                In the dialog, set <strong style={{ fontWeight: 600 }}>Period → Annual</strong> and{" "}
                <strong style={{ fontWeight: 600 }}>Date → {year}</strong>.
              </li>
              <li>
                Click <strong style={{ fontWeight: 600 }}>Download CSV</strong> (not PDF or HTML).
              </li>
            </ol>
            <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.55, color: "var(--muted)", textWrap: "pretty" }}>
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>Held stocks more than a year?</strong>{" "}Repeat with the{" "}
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>Date</strong>{" "}set to each earlier year you first bought a
              holding still open on 31 Dec — Schedule FA needs every lot&rsquo;s original purchase date and cost. The app
              detects the gap and asks for exactly the year it needs.
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 880, margin: "0 auto", padding: "38px 28px 10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 22 }}>
          {[
            ["01", "Parse locally", "Trades, open lots, dividends and cash are read from your CSVs in-tab."],
            ["02", "Convert per-tranche", "Every lot valued at initial, peak and closing ₹ using the SBI TTBR for its exact dates."],
            ["03", "Download the workbook", "Table A3, Table A2 and a full methodology sheet — ready for your CA and the ITR utility."],
          ].map(([n, t, d]) => (
            <div key={n} style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
              <div style={{ ...mono, fontSize: 10.5, color: "var(--accent)" }}>{n}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>{t}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          margin: "40px 0 0",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          background: "color-mix(in oklab, var(--accent) 5%, #FFFFFF)",
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "34px 28px" }}>
          <div style={{ fontFamily: "var(--display)", fontWeight: "var(--dispW)" as unknown as number, fontSize: 24, marginBottom: 20 }}>
            &ldquo;Your statement never leaves your browser.&rdquo;
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 22 }}>
            {[
              ["Stays on your machine", "Parsing and every ₹ computation happen in-tab. Close the tab — nothing persists, nothing is uploaded."],
              ["Only tickers go out", "A request like “AAPL daily closes” fetches public prices. No amounts, no account numbers, no analytics."],
              ["Open source", "The entire pipeline — parsing, TTBR lookup, workbook writer — is auditable, line by line."],
            ].map(([t, d]) => (
              <div key={t}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
