import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Favicon — the "FA" monogram from the header logo (chrome.tsx):
// ink rounded square, cream IBM Plex Serif "FA".
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default async function Icon() {
  const plexSerif = await readFile(join(process.cwd(), "assets/IBMPlexSerif-SemiBold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D1B16",
          color: "#FBFAF7",
          fontFamily: "Plex Serif",
          fontSize: 29,
          fontWeight: 600,
          letterSpacing: "0.02em",
          borderRadius: 11,
        }}
      >
        FA
      </div>
    ),
    { ...size, fonts: [{ name: "Plex Serif", data: plexSerif, weight: 600, style: "normal" }] },
  );
}
