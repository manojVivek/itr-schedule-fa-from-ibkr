"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Footer, Header, Toast } from "@/components/chrome";
import { Landing } from "@/components/landing";
import { ParsingScreen } from "@/components/parsing";
import { Results } from "@/components/results";
import { parseIbkrStatement } from "@/lib/parse-ibkr";
import { buildScheduleFa, faYearStatement } from "@/lib/fa-engine";
import { loadPrices, loadTtbr, ttbrYearsNeeded } from "@/lib/rates-load";
import { PriceTable, TtbrTable } from "@/lib/rates-store";
import { downloadWorkbook } from "@/lib/xlsx-export";
import type { FaResult, ParsedStatement } from "@/lib/types";

export interface LoadedFile {
  name: string;
  short: string;
  meta: string;
  status: "reading" | "done";
  stmt: ParsedStatement | null;
}

function fileMeta(s: ParsedStatement): { short: string; meta: string } {
  const yr = s.periodStart?.slice(0, 4) ?? "?";
  const range =
    s.periodStart && s.periodEnd
      ? `${s.periodStart.slice(8, 10)}/${s.periodStart.slice(5, 7)} – ${s.periodEnd.slice(8, 10)}/${s.periodEnd.slice(5, 7)}/${s.periodEnd.slice(0, 4)}`
      : s.period || "unknown period";
  const bits = [s.account || "unknown account", range, `${s.trades.length} trades`];
  if (s.openPositions.length) bits.push(`${s.openPositions.length} open positions`);
  if (s.periodKind === "cy" && (s.dividends.length || s.cashFlows.length)) bits.push("dividends & cash ledger");
  return { short: `${yr} statement`, meta: bits.join(" · ") };
}

export default function Page() {
  const [screen, setScreen] = useState<"landing" | "parsing" | "results">("landing");
  const [year, setYear] = useState(2025);
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [result, setResult] = useState<FaResult | null>(null);
  const [toast, setToast] = useState("");
  const [computing, setComputing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [rateExtract, setRateExtract] = useState<{ d: string; u: string; g: string }[]>([]);
  const historyInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<LoadedFile[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }, []);

  /** Full pipeline: statements → rates+prices → engine. */
  const recompute = useCallback(
    async (stmts: ParsedStatement[], faYear: number) => {
      const run = ++runIdRef.current;
      setComputing(true);
      try {
        const years = ttbrYearsNeeded(stmts, faYear);
        const { rates, missingYears } = await loadTtbr(years);
        const ttbr = new TtbrTable(rates);

        const cy = faYearStatement(stmts, faYear);
        const symbolMap = new Map<string, { symbol: string; currency: string; exchange?: string }>();
        for (const s of stmts) {
          for (const t of s.trades) if (!symbolMap.has(t.symbol)) symbolMap.set(t.symbol, t);
          for (const p of s.openPositions) if (!symbolMap.has(p.symbol)) symbolMap.set(p.symbol, p);
        }
        const priceRes = await loadPrices([...symbolMap.values()], faYear);
        const prices = new PriceTable(priceRes.prices);

        if (run !== runIdRef.current) return; // superseded

        const res = buildScheduleFa(stmts, faYear, ttbr, prices, priceRes.longNames);
        if (missingYears.length) {
          res.warnings.push(
            `SBI TTBR tables for ${missingYears.join(", ")} are not bundled yet — conversions on those dates used the nearest available rate.`,
          );
        }

        // rate extract for the methodology tab: 31-Dec + first/last acquisition dates
        const acqDates = [...new Set(res.a3.map((r) => r.dateAcquired).filter(Boolean))].sort() as string[];
        const sample = [...new Set([`${faYear}-12-31`, acqDates[0], acqDates[Math.floor(acqDates.length / 2)], acqDates[acqDates.length - 1]])].filter(Boolean) as string[];
        setRateExtract(
          sample.map((d) => ({
            d: `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`,
            u: ttbr.rate("USD", d)?.toFixed(2) ?? "—",
            g: ttbr.rate("GBP", d)?.toFixed(2) ?? "—",
          })),
        );

        setResult(res);
        setScreen("results");
        if (!cy) showToast(`No Jan–Dec ${faYear} statement yet — add it for positions, dividends and cash.`);
      } finally {
        if (run === runIdRef.current) setComputing(false);
      }
    },
    [showToast],
  );

  const addTexts = useCallback(
    async (items: { name: string; text: string }[], opts: { fromHistoryCta?: boolean } = {}) => {
      if (!items.length) return;
      setScreen((s) => (s === "landing" ? "parsing" : s));
      const base = filesRef.current.filter((x) => !items.some((i) => i.name === x.name));
      const placeholders: LoadedFile[] = items.map(({ name }) => ({ name, short: name, meta: "reading…", status: "reading", stmt: null }));
      filesRef.current = [...base, ...placeholders];
      setFiles(filesRef.current);

      const done: LoadedFile[] = items.map(({ name, text }) => {
        const stmt = parseIbkrStatement(text, name);
        return { name, ...fileMeta(stmt), status: "done" as const, stmt };
      });
      // small delay so the reading state is perceptible (design's staged chips)
      await new Promise((r) => setTimeout(r, 450));
      filesRef.current = [...base, ...done];
      setFiles(filesRef.current);

      const stmts = filesRef.current.map((f) => f.stmt).filter((s): s is ParsedStatement => s !== null);
      const prevUncovered = result?.uncovered.length ?? 0;
      await recompute(stmts, year);
      if (opts.fromHistoryCta && prevUncovered > 0) {
        showToast(`${items[0].name} parsed — pending holdings resolved where history matched.`);
      }
    },
    [recompute, result, showToast, year],
  );

  const addFiles = useCallback(
    async (list: FileList | File[], opts: { fromHistoryCta?: boolean } = {}) => {
      const arr = [...list];
      const items = await Promise.all(arr.map(async (f) => ({ name: f.name, text: await f.text() })));
      await addTexts(items, opts);
    },
    [addTexts],
  );

  const loadDemo = useCallback(async () => {
    setDemoMode(true);
    const names = ["sample_2025_Activity.csv", "sample_2024_Activity.csv"];
    const items = await Promise.all(
      names.map(async (n) => ({ name: n, text: await (await fetch(`/samples/${n}`)).text() })),
    );
    await addTexts(items);
  }, [addTexts]);

  const onAddHistory = useCallback(async () => {
    if (demoMode) {
      const has2023 = files.some((f) => f.name.includes("2023"));
      if (!has2023) {
        const n = "sample_2023_Activity.csv";
        const text = await (await fetch(`/samples/${n}`)).text();
        await addTexts([{ name: n, text }], { fromHistoryCta: true });
        return;
      }
    }
    historyInputRef.current?.click();
  }, [addTexts, demoMode, files]);

  const onYear = useCallback(
    (y: number) => {
      setYear(y);
      const stmts = filesRef.current.map((f) => f.stmt).filter((s): s is ParsedStatement => s !== null);
      if (stmts.length) void recompute(stmts, y);
    },
    [files, recompute],
  );

  const reset = useCallback(() => {
    runIdRef.current++;
    filesRef.current = [];
    setScreen("landing");
    setFiles([]);
    setResult(null);
    setDemoMode(false);
    setToast("");
  }, []);

  const account = result ? faYearStatement(files.map((f) => f.stmt!).filter(Boolean), result.faYear)?.account ?? files.find((f) => f.stmt?.account)?.stmt?.account ?? "—" : "—";

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--paper)", color: "var(--ink)" }}>
      <Header showReset={screen === "results"} onReset={reset} />

      {screen === "landing" && <Landing year={year} onYear={onYear} onFiles={(f) => void addFiles(f)} onDemo={() => void loadDemo()} />}

      {screen === "parsing" && (
        <ParsingScreen files={files} note={computing ? "Building tranches and matching lots…" : "Reading files…"} />
      )}

      {screen === "results" && result && (
        <Results
          result={result}
          files={files}
          account={account}
          onAddHistory={() => void onAddHistory()}
          addHistoryLabel={computing ? "Computing…" : ""}
          onDownload={() => {
            downloadWorkbook(result);
            showToast(`Schedule-FA-${result.faYear}.xlsx saved — generated locally, nothing uploaded`);
          }}
          rateExtract={rateExtract}
        />
      )}

      <input
        ref={historyInputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files, { fromHistoryCta: true });
          e.target.value = "";
        }}
      />

      <Footer />
      <Toast text={toast} />
    </div>
  );
}
