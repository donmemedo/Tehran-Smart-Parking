"use client";
import { useApp } from "@/lib/app";

const ENDPOINTS = [
  ["GET", "/api/zones", "zones"],
  ["GET", "/api/zones/{id}", "zone"],
  ["GET", "/api/stats/overview", "overview"],
  ["GET", "/api/open-data/zones.geojson", "geojson"],
  ["WS", "/ws/live", "ws"],
] as const;

export default function OpenData() {
  const { t, lang } = useApp();
  return (
    <section id="api" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal glass card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[clamp(1.6rem,4.5vw,2.4rem)] font-extrabold tracking-[-0.02em]">{t.api.title}</h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.api.lead}</p>
          </div>
          {/* Same-origin path, proxied to the backend by next.config.mjs rewrites. */}
          <a href="/api/open-data/zones.geojson" target="_blank" rel="noopener noreferrer" className="btn btn-primary">{t.api.try}</a>
        </div>

        <div className="mt-6 overflow-x-auto">
          <ul className="grid min-w-[420px] gap-2">
            {ENDPOINTS.map(([m, p, k]) => (
              <li key={p} className="flex items-center gap-3 rounded-[16px] border p-3 hairline font-mono text-[12px]"
                style={{ background: "var(--surface)" }} dir="ltr">
                <span className="chip !py-0.5 !text-[10px] shrink-0"
                  style={{ color: m === "WS" ? "var(--violet)" : "var(--accent)", borderColor: "currentColor" }}>{m}</span>
                <span className="font-semibold">{p}</span>
                <span dir="auto" className={`ms-auto truncate text-[var(--muted)] ${lang === "fa" ? "font-fa" : "font-sans"}`}>{t.api.desc[k]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
