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

const DESCRIPTION =
  "Turn raw Interactive Brokers statements into a filing-ready Indian Schedule FA — per-tranche Table A3 at the correct daily SBI TTBR, computed entirely in your browser. Nothing is uploaded.";

export const metadata: Metadata = {
  metadataBase: new URL("https://itr-schedule-fa-helper.manojvivek.dev"),
  title: "ITR Schedule FA Helper — IBKR → Schedule FA, in your browser",
  description: DESCRIPTION,
  applicationName: "ITR Schedule FA Helper",
  keywords: [
    "Schedule FA",
    "Interactive Brokers",
    "IBKR",
    "ITR",
    "foreign assets",
    "SBI TTBR",
    "income tax India",
  ],
  openGraph: {
    type: "website",
    siteName: "ITR Schedule FA Helper",
    url: "https://itr-schedule-fa-helper.manojvivek.dev",
    title: "ITR Schedule FA Helper — IBKR → Schedule FA",
    description: DESCRIPTION,
    locale: "en_IN",
    // image auto-attached from app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "ITR Schedule FA Helper — IBKR → Schedule FA",
    description: DESCRIPTION,
    // image auto-attached from app/twitter-image.tsx
  },
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
