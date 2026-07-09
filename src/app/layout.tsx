import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ITR Schedule FA Helper — IBKR → Schedule FA, in your browser",
  description:
    "Turn raw Interactive Brokers statements into a filing-ready Indian Schedule FA — per-tranche Table A3 at the correct daily SBI TTBR, computed entirely in your browser. Nothing is uploaded.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
