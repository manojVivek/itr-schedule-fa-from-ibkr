"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { mono } from "@/components/chrome";
import { fmtINR } from "@/lib/util";
import type { FaResult, FaA3Row } from "@/lib/types";
import type { LoadedFile } from "@/app/page";

const inr = (n: number) => `₹${fmtINR(n)}`;
const fig: CSSProperties = { fontFamily: "var(--fig)", fontVariantNumeric: "tabular-nums" };
const th: CSSProperties = { ...mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" };
const gridCols = "minmax(225px, 1.5fr) minmax(195px, 1.2fr) repeat(5, minmax(105px, 1fr))";

/** Action-required red — a warm brick that sits in the ledger paper palette. */
const RED = {
  border: "#E4C3BB",
  bg: "#FBEDE8",
  strong: "#A23A26", // icon + CTA fill
  onStrong: "#FCF1ED",
  title: "#7A2A1A",
  body: "#8F4535",
  muted: "#B06B57",
};

function prettyDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
const dmy = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const ccySym = (c: string) => (c === "GBP" ? "£" : "$");

interface SecGroup {
  tk: string;
  name: string;
  meta: string;
  lots: FaA3Row[];
  pending?: { note: string; det: string };
  sums: { init: number; peak: number; close: number; div: number; proc: number } | null;
}

function groupSecs(result: FaResult): SecGroup[] {
  const map = new Map<string, SecGroup>();
  for (const r of result.a3) {
    const name = r.entityName.replace(` (${r.symbol})`, "");
    const g =
      map.get(r.symbol) ??
      map
        .set(r.symbol, {
          tk: r.symbol,
          name: name === r.symbol ? "" : name,
          meta: `${r.countryCode === "44" ? "UK" : "US"} · ${r.currency}`,
          lots: [],
          sums: { init: 0, peak: 0, close: 0, div: 0, proc: 0 },
        })
        .get(r.symbol)!;
    g.lots.push(r);
    g.sums!.init += r.initialInr;
    g.sums!.peak += r.peakInr;
    g.sums!.close += r.closingInr;
    g.sums!.div += r.grossPaidInr;
    g.sums!.proc += r.grossProceedsInr;
  }
  for (const u of result.uncovered) {
    map.set(u.symbol, {
      tk: u.symbol,
      name: "",
      meta: `${u.currency}`,
      lots: [],
      pending: {
        note: "Held at 31-Dec — purchase history not in your files",
        det: `${u.quantity} sh held · excluded from workbook`,
      },
      sums: null,
    });
  }
  return [...map.values()].sort((a, b) => (b.sums?.close ?? 0) - (a.sums?.close ?? 0));
}

export function Results({
  result,
  files,
  account,
  onAddHistory,
  addHistoryLabel,
  onDownload,
  rateExtract,
}: {
  result: FaResult;
  files: LoadedFile[];
  account: string;
  onAddHistory: () => void;
  addHistoryLabel: string;
  onDownload: () => void;
  rateExtract: { d: string; u: string; g: string }[];
}) {
  const secs = useMemo(() => groupSecs(result), [result]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"a3" | "a2" | "m">("a3");

  const year = result.faYear;
  const ay = `AY ${year + 1}-${String(year + 2).slice(2)}`;
  const dlName = `Schedule-FA-${year}.xlsx`;
  const recon = result.reconciliation;
  const pending = result.uncovered;
  const totalDiv = result.a3.reduce((s, r) => s + r.grossPaidInr, 0);
  const totalProc = result.a3.reduce((s, r) => s + r.grossProceedsInr, 0);
  const neededYear =
    Math.min(...files.map((f) => Number(f.stmt?.periodStart?.slice(0, 4) ?? year)).filter(Number.isFinite)) - 1;

  const tabS = (sel: boolean): CSSProperties => ({
    padding: "7px 13px",
    fontSize: 11.5,
    ...mono,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    borderRadius: 6,
    whiteSpace: "nowrap",
    background: sel ? "var(--card)" : "transparent",
    color: sel ? "var(--accent)" : "var(--muted)",
    boxShadow: sel ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
  });

  const a3head = [
    "Sl No", "Country/Region name", "Country code", "Name of entity", "Address of entity", "ZIP code",
    "Nature of entity", "Date of acquiring the interest", "Initial value of the investment (₹)",
    "Peak value of investment during the period (₹)", "Closing balance (₹)",
    "Total gross amount paid/credited with respect to the holding during the period (₹)",
    "Total gross proceeds from sale or redemption of investment during the period (₹)",
  ];
  const PREVIEW_CAP = 150;
  const a3cells = result.a3
    .slice(0, PREVIEW_CAP)
    .flatMap((r, i) => [
      String(i + 1), r.countryName, r.countryCode, r.entityName, r.address, r.zip, r.natureOfEntity,
      dmy(r.dateAcquired), fmtINR(r.initialInr), fmtINR(r.peakInr), fmtINR(r.closingInr),
      r.grossPaidInr ? fmtINR(r.grossPaidInr) : "0", r.grossProceedsInr ? fmtINR(r.grossProceedsInr) : "0",
    ]);
  if (result.a3.length > PREVIEW_CAP) {
    a3cells.push(`… ${result.a3.length - PREVIEW_CAP} more rows in the workbook`, ...Array(12).fill(""));
  }

  const a2head = [
    "Sl No", "Country/Region name", "Country code", "Name of financial institution", "Address of institution",
    "ZIP code", "Account number", "Status", "Account opening date", "Peak balance during the period (₹)",
    "Closing balance (₹)", "Nature of amount credited", "Gross amount credited (₹)",
  ];
  const a2 = result.a2;
  const a2incomes = a2 ? Object.entries(a2.incomes).filter(([, v]) => v > 0) : [];
  const a2cells = a2
    ? (a2incomes.length ? a2incomes : [["—", 0] as [string, number]]).flatMap(([nature, amount], i) =>
        i === 0
          ? ["1", a2.countryName, a2.countryCode, a2.institution, a2.address, a2.zip, a2.accountNumber, a2.status, a2.openingDate ?? "—", fmtINR(a2.peakInr), fmtINR(a2.closingInr), nature, fmtINR(amount)]
          : ["", "", "", "", "", "", "", "", "", "", "", nature, fmtINR(amount)],
      )
    : [];

  const methRows = [
    { k: "Scope", v: `${ay} — Schedule FA covers calendar year 01/01/${year} – 31/12/${year} (the calendar year, not the April–March financial year used for income).` },
    { k: "Initial value", v: "Per lot: cost basis (incl. commission) × SBI TTBR on the acquisition date." },
    { k: "Peak value", v: "Per lot: units × maximum over the held window of (daily close × same-day SBI TTBR), anchored to the broker's own 31-Dec close so split-adjusted feeds cannot distort levels." },
    { k: "Closing value", v: `Units held on 31 Dec × broker-reported 31-Dec close × 31-Dec TTBR.` },
    { k: "Income", v: "Gross dividend × TTBR on the credit date, attributed to the lots held on that date — before US/UK withholding." },
    { k: "Proceeds", v: "Sale quantity × execution price × TTBR on the trade date, allocated FIFO to lots." },
    { k: "Rate source", v: "SBI daily TTBR reference sheets; non-business days roll back to the previous published rate." },
    { k: "Price source", v: "Public end-of-day closes, fetched by ticker symbol only — no account data leaves the browser." },
    {
      k: "Exclusions",
      v: pending.length === 0
        ? "None — every year-end lot has verified acquisition history."
        : `Lots without acquisition history (${pending.map((u) => u.symbol).join(", ")}) are excluded and listed with the exact statement year needed. Values are never estimated.`,
    },
  ];

  const cell: CSSProperties = {
    padding: "6px 9px",
    borderBottom: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)",
    borderRight: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const headCell: CSSProperties = {
    padding: "7px 9px",
    background: "var(--soft)",
    borderBottom: "1px solid var(--rule)",
    borderRight: "1px solid var(--rule)",
    fontWeight: 600,
    fontSize: 9.6,
    lineHeight: 1.3,
    position: "sticky",
    top: 0,
  };

  return (
    <main style={{ flex: 1 }}>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 46px" }}>
        {/* header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>
              Schedule FA · {ay} · calendar year {year}
            </div>
            <h2 style={{ margin: "6px 0 9px", fontFamily: "var(--display)", fontWeight: "var(--dispW)" as unknown as number, fontSize: 26 }}>
              Foreign assets, per tranche
            </h2>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                Account {account} · Interactive Brokers LLC ·
              </span>
              {files.map((f) => (
                <span
                  key={f.name}
                  style={{ ...mono, fontSize: 10.5, border: "1px solid var(--rule)", borderRadius: 999, padding: "3px 9px", background: "var(--card)", color: "var(--muted)" }}
                >
                  {f.short}
                </span>
              ))}
            </div>
          </div>
          {recon.ok ? (
            <div style={{ border: "1px solid color-mix(in oklab, var(--accent) 45%, #FFFFFF)", background: "color-mix(in oklab, var(--accent) 9%, #FFFFFF)", borderRadius: 10, padding: "10px 14px", maxWidth: 320 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)" }}>✓ Reconciled</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>
                Σ tranche closings = portfolio value × 31-Dec TTBR ({inr(recon.expectedClosingInr)})
              </div>
            </div>
          ) : (
            <div style={{ border: "1px solid #E8D9AD", background: "#FBF4DF", borderRadius: 10, padding: "10px 14px", maxWidth: 320 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#5C4610" }}>Not reconciled yet</div>
              <div style={{ fontSize: 11, color: "#7A5F1E", marginTop: 2, lineHeight: 1.45 }}>
                Σ tranche closings {inr(recon.actualClosingInr)} vs portfolio {inr(recon.expectedClosingInr)} — off by {inr(Math.abs(recon.expectedClosingInr - recon.actualClosingInr))}
              </div>
            </div>
          )}
        </div>

        {/* tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 10, marginTop: 20 }}>
          {[
            ["Securities", String(result.stats.securities + pending.length), ""],
            ["Lots", String(result.stats.tranches), pending.length ? `${pending.length} holdings pending history` : "all history matched"],
            ["Σ Initial", inr(result.totals.initialInr), ""],
            ["Σ Peak", inr(result.totals.peakInr), ""],
            ["Σ Closing", inr(result.totals.closingInr), ""],
            ["Dividends credited", inr(result.totals.dividendsInr), ""],
          ].map(([label, val, sub]) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 10, padding: "var(--tileP)" }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</div>
              <div style={{ ...fig, fontSize: 19, fontWeight: 600, marginTop: 7, letterSpacing: "-0.01em" }}>{val}</div>
              {sub && <div style={{ ...mono, fontSize: 9.5, color: "var(--muted)", marginTop: 3 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* pending-history warning */}
        {pending.length > 0 && (
          <div style={{ marginTop: 14, border: `1px solid ${RED.border}`, background: RED.bg, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", background: RED.strong, color: RED.onStrong, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>!</div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: RED.title }}>
                {pending.length} holding{pending.length > 1 ? "s" : ""} lack acquisition history
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: RED.body, marginTop: 3, textWrap: "pretty" }}>
                {pending.map((u) => u.symbol).join(", ")} {pending.length > 1 ? "were" : "was"} bought before your earliest
                statement, so their purchase dates and costs are not in these files. They are excluded from the workbook
                until resolved — nothing is ever estimated.
              </div>
            </div>
            <button onClick={onAddHistory} className="hoverBtn" style={{ background: RED.strong, color: RED.onStrong, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {addHistoryLabel || `Add ${neededYear} Activity Statement`}
            </button>
          </div>
        )}

        {/* per-security table */}
        <div style={{ marginTop: 18, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Per-security tranches</div>
            <div style={{ ...mono, fontSize: 10.5, color: "var(--muted)" }}>values in ₹ · TTBR applied per date · click a row to expand</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 920 }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0 12px", padding: "8px 18px", borderTop: "1px solid var(--rule)", background: "var(--soft)" }}>
                <div style={th}>Security / lot</div>
                <div style={th}>Detail</div>
                {["Initial ₹", "Peak ₹", "Closing ₹", "Credited ₹", "Proceeds ₹"].map((h) => (
                  <div key={h} style={{ ...th, textAlign: "right" }}>{h}</div>
                ))}
              </div>
              {secs.map((sec) => {
                const open = expanded[sec.tk] ?? false;
                return (
                  <div key={sec.tk}>
                    <div
                      onClick={() => setExpanded((s) => ({ ...s, [sec.tk]: !open }))}
                      className="hoverRow"
                      style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0 12px", padding: "var(--rY) 18px", borderTop: "1px solid var(--rule)", cursor: "pointer", alignItems: "baseline" }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                        <span style={{ ...mono, fontSize: 10, color: "var(--muted)", flex: "none" }}>{open ? "▾" : "▸"}</span>
                        <span style={{ fontWeight: 600, fontSize: "var(--fs)" }}>{sec.tk}</span>
                        <span style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.name}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {sec.sums ? `${sec.lots.length} lot${sec.lots.length > 1 ? "s" : ""}` : "pending history"} · {sec.meta}
                      </div>
                      {(["init", "peak", "close", "div", "proc"] as const).map((k) => (
                        <div key={k} style={{ textAlign: "right", ...fig, fontSize: "var(--fs)", fontWeight: 600 }}>
                          {sec.sums && (k === "init" || k === "peak" || k === "close" ? true : sec.sums[k] > 0) ? inr(sec.sums[k]) : "—"}
                        </div>
                      ))}
                    </div>
                    {open && (
                      <div>
                        {sec.lots.map((lot, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0 12px", padding: "var(--rY) 18px", borderTop: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)", alignItems: "baseline" }}>
                            <div style={{ paddingLeft: 18, ...mono, fontSize: 11.5 }}>
                              {prettyDate(lot.dateAcquired)}
                              {lot.srcYear && (
                                <span style={{ marginLeft: 6, fontSize: 9, border: "1px solid var(--rule)", borderRadius: 4, padding: "1px 5px", color: "var(--muted)" }}>{lot.srcYear}</span>
                              )}
                            </div>
                            <div style={{ ...fig, fontSize: 11, color: "var(--muted)" }}>
                              {lot.units % 1 ? lot.units.toFixed(4) : lot.units} sh × {ccySym(lot.currency)}
                              {lot.unitPriceNative.toFixed(2)} · TTBR {lot.acqTtbr.toFixed(2)}
                              {lot.saleNote ? ` · ${lot.saleNote}` : ""}
                            </div>
                            <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)" }}>{inr(lot.initialInr)}</div>
                            <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)" }}>{inr(lot.peakInr)}</div>
                            <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)" }}>{lot.closingInr ? inr(lot.closingInr) : "—"}</div>
                            <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)" }}>{lot.grossPaidInr ? inr(lot.grossPaidInr) : "—"}</div>
                            <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)" }}>{lot.grossProceedsInr ? inr(lot.grossProceedsInr) : "—"}</div>
                          </div>
                        ))}
                        {sec.pending && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", padding: "var(--rY) 18px", paddingLeft: 36, borderTop: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)", background: RED.bg }}>
                            <span style={{ ...mono, fontSize: 11.5, color: RED.body }}>↳ {sec.pending.note}</span>
                            <span style={{ ...mono, fontSize: 11, color: RED.muted }}>{sec.pending.det}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* totals */}
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0 12px", padding: "11px 18px", borderTop: "1px solid var(--rule)", background: "var(--soft)", alignItems: "baseline" }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Total — {result.stats.tranches} lots included</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {pending.length ? `excludes ${pending.length} pending holding${pending.length > 1 ? "s" : ""}` : "all lots included · reconciled"}
                </div>
                <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)", fontWeight: 600 }}>{inr(result.totals.initialInr)}</div>
                <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)", fontWeight: 600 }}>{inr(result.totals.peakInr)}</div>
                <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)", fontWeight: 600 }}>{inr(result.totals.closingInr)}</div>
                <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)", fontWeight: 600 }}>{inr(totalDiv)}</div>
                <div style={{ textAlign: "right", ...fig, fontSize: "var(--fs)", fontWeight: 600 }}>{totalProc ? inr(totalProc) : "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* A2 + workbook cards */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: 20 }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>Table A2 · Custodial account</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{a2?.institution ?? "—"}</div>
            <div style={{ ...mono, fontSize: 10.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>
              {a2 ? `${a2.accountNumber} · ${a2.address} · ${a2.status.toLowerCase()}` : "needs the calendar-year statement"}
            </div>
            <div style={{ marginTop: 14 }}>
              {(
                [
                  [`Cash peak${a2?.peakDate ? ` (${prettyDate(a2.peakDate)})` : ""}`, a2 ? inr(a2.peakInr) : "—"],
                  ["Cash closing (31 Dec)", a2 ? inr(a2.closingInr) : "—"],
                  ...(a2 ? Object.entries(a2.incomes).filter(([, v]) => v > 0).map(([k, v]) => [`${k === "Dividend" ? "Dividends credited" : k}`, inr(v)]) : []),
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "var(--rY) 0", borderTop: "1px solid var(--rule)" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
                  <span style={{ ...fig, fontSize: 12.5, fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ ...mono, fontSize: 10, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
              cash reconstructed from the statement&rsquo;s ledger · securities reported per-tranche in Table A3
            </div>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>Workbook</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8, ...fig }}>{dlName}</div>
            <div style={{ marginTop: 12, flex: 1 }}>
              {[
                ["Schedule FA — Table A3", `${result.a3.length} tranche rows · 13-column ITR layout`, 1],
                ["Schedule FA — Table A2", "custodial account · stacked income rows", 0.72],
                ["Methodology", "every number explained — rates, dates, sources · CA-review-ready", 0.45],
              ].map(([t, d, op]) => (
                <div key={t as string} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--rule)" }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: "var(--accent)", opacity: op as number, flex: "none" }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onDownload} className="hoverBtn" style={{ width: "100%", marginTop: 14, background: "var(--accent)", color: "#FCFBF8", border: "none", borderRadius: 9, padding: 12, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              Download {dlName}
            </button>
            {pending.length > 0 && (
              <div style={{ ...mono, fontSize: 10.5, color: RED.strong, marginTop: 9, lineHeight: 1.5 }}>
                {pending.length} pending holding{pending.length > 1 ? "s are" : " is"} excluded until history is added — never estimated.
              </div>
            )}
            <div style={{ ...mono, fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>generated locally · nothing uploaded</div>
          </div>
        </div>

        {/* workbook preview */}
        <div style={{ marginTop: 16, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Workbook preview</div>
            <div style={{ ...mono, fontSize: 10.5, color: "var(--muted)" }}>exactly what your CA opens</div>
          </div>
          <div style={{ borderTop: "1px solid var(--rule)", overflow: "auto", maxHeight: 380 }}>
            {tab === "a3" && (
              <div style={{ display: "grid", gridTemplateColumns: "44px 150px 62px 185px 235px 70px 150px 100px repeat(5, 118px)", minWidth: 1700, ...fig, fontSize: 10.8 }}>
                {a3head.map((h) => (
                  <div key={h} style={{ ...headCell, fontFamily: "var(--font-sans)" }}>{h}</div>
                ))}
                {a3cells.map((c, i) => (
                  <div key={i} style={cell}>{c}</div>
                ))}
              </div>
            )}
            {tab === "a2" && (
              <div style={{ display: "grid", gridTemplateColumns: "44px 150px 62px 190px 225px 60px 105px 125px 105px 130px 118px 125px 130px", minWidth: 1560, ...fig, fontSize: 10.8 }}>
                {a2head.map((h) => (
                  <div key={h} style={{ ...headCell, fontFamily: "var(--font-sans)" }}>{h}</div>
                ))}
                {a2cells.map((c, i) => (
                  <div key={i} style={cell}>{c}</div>
                ))}
              </div>
            )}
            {tab === "m" && (
              <div style={{ maxWidth: 860, padding: "6px 0 14px" }}>
                {methRows.map((m) => (
                  <div key={m.k} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "0 16px", padding: "9px 18px", borderBottom: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)" }}>
                    <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>{m.k}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.55, textWrap: "pretty" }}>{m.v}</div>
                  </div>
                ))}
                <div style={{ padding: "13px 18px 4px", ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Rate extract — SBI TTBR</div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 110px 110px", padding: "0 18px", ...fig, fontSize: 11 }}>
                  <div style={{ padding: "6px 8px", fontWeight: 600, borderBottom: "1px solid var(--rule)" }}>Date</div>
                  <div style={{ padding: "6px 8px", fontWeight: 600, borderBottom: "1px solid var(--rule)", textAlign: "right" }}>USD ₹</div>
                  <div style={{ padding: "6px 8px", fontWeight: 600, borderBottom: "1px solid var(--rule)", textAlign: "right" }}>GBP ₹</div>
                </div>
                {rateExtract.map((r) => (
                  <div key={r.d} style={{ display: "grid", gridTemplateColumns: "120px 110px 110px", padding: "0 18px", ...fig, fontSize: 11 }}>
                    <div style={{ padding: "5px 8px", borderBottom: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)" }}>{r.d}</div>
                    <div style={{ padding: "5px 8px", borderBottom: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)", textAlign: "right" }}>{r.u}</div>
                    <div style={{ padding: "5px 8px", borderBottom: "1px solid color-mix(in oklab, var(--rule) 55%, #FFFFFF)", textAlign: "right" }}>{r.g}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 3, padding: "6px 10px", borderTop: "1px solid var(--rule)", background: "var(--soft)", overflowX: "auto" }}>
            <button onClick={() => setTab("a3")} style={tabS(tab === "a3")}>Schedule FA - Table A3</button>
            <button onClick={() => setTab("a2")} style={tabS(tab === "a2")}>Schedule FA - Table A2</button>
            <button onClick={() => setTab("m")} style={tabS(tab === "m")}>Methodology</button>
          </div>
        </div>
      </section>
    </main>
  );
}
