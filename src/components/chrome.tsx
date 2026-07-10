"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

export const mono: CSSProperties = { fontFamily: "var(--mono)" };

export function Header({ showReset = false, onReset }: { showReset?: boolean; onReset?: () => void }) {
  return (
    <header style={{ borderBottom: "1px solid var(--rule)" }}>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "13px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: "var(--ink)",
              color: "#FBFAF7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--display)",
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "0.02em",
              flex: "none",
            }}
          >
            FA
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.01em" }}>ITR Schedule FA Helper</div>
            <div
              style={{
                ...mono,
                fontSize: 9.5,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--muted)",
                marginTop: 1,
              }}
            >
              IBKR → Schedule FA · in your browser
            </div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: "1px solid var(--rule)",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 11.5,
              color: "var(--muted)",
              background: "var(--card)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flex: "none" }} />
            Files never leave this tab
          </div>
          <Link href="/guide" style={{ fontSize: 12, fontWeight: 500 }}>
            How it works
          </Link>
          <a
            href="https://github.com/manojvivek/itr-schedule-fa-from-ibkr"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            Open source ↗
          </a>
          {showReset && (
            <button
              onClick={onReset}
              className="hoverGhost"
              style={{
                border: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--muted)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Start over
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--rule)", marginTop: "auto" }}>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "15px 28px",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          ...mono,
          fontSize: 10.5,
          color: "var(--muted)",
        }}
      >
        <span>
          ITR Schedule FA Helper · open source (MIT) · made by{" "}
          <a href="https://manojvivek.dev" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            Manoj Vivek ↗
          </a>
        </span>
        <span>Rates: SBI daily TTBR · Prices: public EOD by ticker · Not tax advice — review with your CA</span>
      </div>
    </footer>
  );
}

export function Toast({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1D1B16",
        color: "#FBFAF7",
        borderRadius: 9,
        padding: "11px 18px",
        fontSize: 12.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        zIndex: 60,
        animation: "fadeUp .25s ease",
        maxWidth: "90vw",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
