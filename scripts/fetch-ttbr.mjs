// Fetch SBI TT BUY rates (USD, GBP) for a calendar year from the community
// archive of SBI's daily FOREX_CARD_RATES PDFs (github.com/skbly7/sbi-tt-rates-historical).
// Usage: node scripts/fetch-ttbr.mjs 2025 > public/data/ttbr/2025.json
// Dev-only tooling — pdfjs never ships in the app bundle.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const year = process.argv[2];
if (!/^\d{4}$/.test(year ?? "")) {
  console.error("usage: node scripts/fetch-ttbr.mjs <year>");
  process.exit(1);
}
const RAW = "https://raw.githubusercontent.com/skbly7/sbi-tt-rates-historical/master";

function* weekdays(y) {
  const cur = new Date(`${y}-01-01T00:00:00Z`);
  const stop = new Date(`${y}-12-31T00:00:00Z`);
  while (cur <= stop) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) yield cur.toISOString().slice(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

async function ratesFor(iso) {
  const [y, m] = iso.split("-");
  for (const t of ["19:15", "14:15"]) {
    const res = await fetch(`${RAW}/${y}/${m}/${iso}-${t}.pdf`).catch(() => null);
    if (!res?.ok) continue;
    const buf = new Uint8Array(await res.arrayBuffer());
    let text = "";
    try {
      const doc = await getDocument({ data: buf, verbosity: 0 }).promise;
      for (let p = 1; p <= doc.numPages; p++) {
        const c = await (await doc.getPage(p)).getTextContent();
        const items = c.items.filter((i) => "str" in i && i.str.trim());
        const rows = [];
        for (const it of items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
          const r = rows.find((x) => Math.abs(x.y - it.transform[5]) < 3);
          if (r) r.cells.push({ x: it.transform[4], s: it.str });
          else rows.push({ y: it.transform[5], cells: [{ x: it.transform[4], s: it.str }] });
        }
        text += rows.map((r) => r.cells.sort((a, b) => a.x - b.x).map((c2) => c2.s).join(" | ")).join("\n") + "\n";
      }
      await doc.destroy?.();
    } catch {
      continue;
    }
    const usd = text.match(/USD\/INR\s*\|\s*([\d.]+)/)?.[1];
    const gbp = text.match(/GBP\/INR\s*\|\s*([\d.]+)/)?.[1];
    if (usd) return { usd: Number(usd), gbp: gbp ? Number(gbp) : undefined };
  }
  return null;
}

const out = { USD: {}, GBP: {} };
let ok = 0;
for (const iso of weekdays(year)) {
  const r = await ratesFor(iso).catch(() => null);
  if (r) {
    out.USD[iso] = r.usd;
    if (r.gbp) out.GBP[iso] = r.gbp;
    ok++;
  }
}
process.stderr.write(`${year}: ${ok} days with rates\n`);
console.log(JSON.stringify(out));
