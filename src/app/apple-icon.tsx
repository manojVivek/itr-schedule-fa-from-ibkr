import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Apple touch icon — same "FA" monogram, full-bleed (iOS masks the corners).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        FA
      </div>
    ),
    { ...size, fonts: [{ name: "Plex Serif", data: plexSerif, weight: 600, style: "normal" }] },
  );
}
