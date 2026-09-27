"use client";
import { useApp } from "@/lib/app";
import { API } from "@/lib/api";

const ENDPOINTS = [
  ["GET", "/api/zones", "Live availability & rates for every zone"],
  ["GET", "/api/zones/{id}", "Occupancy history, forecast and rate changes"],
  ["GET", "/api/stats/overview", "City-wide KPIs and the daily occupancy curve"],
  ["GET", "/api/open-data/zones.geojson", "GeoJSON feed for maps and research"],
  ["WS", "/ws/live", "Push stream, one frame every 5 seconds"],
];

export default function OpenData() {
  const { t } = useApp();
  return (
    <section id="api" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal glass card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[clamp(1.6rem,4.5vw,2.4rem)] font-extrabold tracking-[-0.02em]">{t.api.title}</h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.api.lead}</p>
          </div>
          <a href={`${API}/docs`} target="_blank" rel="noreferrer" className="btn btn-primary">{t.api.try}</a>
        </div>

        <div className="mt-6 overflow-x-auto">
          <ul className="grid min-w-[420px] gap-2">
            {ENDPOINTS.map(([m, p, d]) => (
              <li key={p} className="flex items-center gap-3 rounded-[16px] border p-3 hairline font-mono text-[12px]"
                style={{ background: "var(--surface)" }} dir="ltr">
                <span className="chip !py-0.5 !text-[10px] shrink-0"
                  style={{ color: m === "WS" ? "var(--violet)" : "var(--accent)", borderColor: "currentColor" }}>{m}</span>
                <span className="font-semibold">{p}</span>
                <span className="ms-auto truncate text-[var(--muted)] font-sans">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
