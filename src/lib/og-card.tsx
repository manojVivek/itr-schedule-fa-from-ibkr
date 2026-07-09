import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared 1200×630 social card, rendered for both opengraph-image and twitter-image.
// Reproduces the app's ledger theme with the "FA" monogram and IBM Plex Serif.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ITR Schedule FA Helper — turn Interactive Brokers statements into a filing-ready Indian Schedule FA";

const PAPER = "#FAF8F3";
const INK = "#1D1B16";
const MUTED = "#6E6857";
const RULE = "#E5E0D2";
const ACCENT = "#1E6E50";
const CREAM = "#FBFAF7";

export async function renderOgCard() {
  const [serifSemi, serifReg] = await Promise.all([
    readFile(join(process.cwd(), "assets/IBMPlexSerif-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/IBMPlexSerif-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "64px 80px",
          fontFamily: "Plex Serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: INK,
              color: CREAM,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            FA
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            IBKR → Indian Schedule FA
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 16,
              maxWidth: 900,
              fontSize: 52,
              fontWeight: 600,
              lineHeight: 1.1,
              color: INK,
            }}
          >
            Turn Interactive Brokers statements into a filing-ready Schedule FA.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              maxWidth: 810,
              fontSize: 25,
              fontWeight: 400,
              lineHeight: 1.42,
              color: MUTED,
            }}
          >
            One row per lot at the correct daily SBI TTBR — initial, peak, closing and dividends. Computed entirely in your
            browser.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: `1px solid ${RULE}`,
            paddingTop: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: INK }}>
            itr-schedule-fa-helper.manojvivek.dev
          </div>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 400, color: MUTED }}>Free · Open source</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex Serif", data: serifSemi, weight: 600, style: "normal" },
        { name: "Plex Serif", data: serifReg, weight: 400, style: "normal" },
      ],
    },
  );
}
