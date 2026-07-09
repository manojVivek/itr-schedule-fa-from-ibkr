"use client";

import { mono } from "@/components/chrome";
import type { LoadedFile } from "@/app/page";

export function ParsingScreen({ files, note }: { files: LoadedFile[]; note: string }) {
  return (
    <main style={{ flex: 1 }}>
      <section style={{ maxWidth: 680, margin: "0 auto", padding: "62px 28px" }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
          Parsing locally — nothing uploaded
        </div>
        <h2 style={{ margin: "0 0 18px", fontFamily: "var(--display)", fontWeight: "var(--dispW)" as unknown as number, fontSize: 27 }}>
          Reading your statements
        </h2>
        {files.map((f) => (
          <FileChip key={f.name} f={f} />
        ))}
        <div style={{ marginTop: 18, fontSize: 12, color: "var(--muted)" }}>{note}</div>
      </section>
    </main>
  );
}

export function FileChip({ f }: { f: LoadedFile }) {
  const warn = f.stmt?.warnings[0];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 10,
        padding: "13px 16px",
        marginTop: 10,
        animation: "fadeUp .3s ease",
      }}
    >
      {f.status === "reading" ? (
        <div
          style={{
            width: 15,
            height: 15,
            borderRadius: "50%",
            border: "2px solid var(--rule)",
            borderTopColor: "var(--accent)",
            animation: "spin .7s linear infinite",
            flex: "none",
            marginTop: 2,
          }}
        />
      ) : (
        <div
          style={{
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#FFFFFF",
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            marginTop: 1,
          }}
        >
          ✓
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...mono, fontSize: 12.5, fontWeight: 600, overflowWrap: "anywhere" }}>{f.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{f.meta}</div>
        {warn && <div style={{ fontSize: 11.5, color: "#8A6A1B", marginTop: 3 }}>▲ {warn}</div>}
      </div>
    </div>
  );
}
