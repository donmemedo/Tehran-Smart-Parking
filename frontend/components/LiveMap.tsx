"use client";
import { useState } from "react";
import { useApp } from "@/lib/app";
import { statusColor } from "@/lib/api";
import { fmt, pct } from "@/lib/i18n";

export default function LiveMap() {
  const { t, lang, zones, live, select } = useApp();
  const [hover, setHover] = useState<string | null>(null);
  const hz = zones.find((z) => z.id === hover);

  return (
    <section id="map" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[clamp(1.6rem,4.5vw,2.5rem)] font-extrabold tracking-[-0.02em]">{t.map.title}</h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.map.lead}</p>
          </div>
          <span className="chip">
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: live ? "var(--accent)" : "var(--amber)" }} />
            {live ? t.map.live : t.map.offline}
          </span>
        </div>

        <div className="glass card mt-6 overflow-hidden p-2 sm:p-4">
          <div className="relative w-full overflow-hidden rounded-[18px]"
            style={{ aspectRatio: "16 / 11", background: "linear-gradient(160deg, var(--bg-2), transparent)" }}>
            <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" role="img" aria-label={t.map.title}>
              <defs>
                <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
                  <path d="M6 0H0V6" fill="none" stroke="var(--border)" strokeWidth="0.18" />
                </pattern>
                <radialGradient id="vig" cx="50%" cy="45%" r="70%">
                  <stop offset="60%" stopColor="transparent" />
                  <stop offset="100%" stopColor="var(--bg)" stopOpacity=".65" />
                </radialGradient>
              </defs>
              <rect width="100" height="70" fill="url(#grid)" />
              {/* stylised arterials + river of the city */}
              <g stroke="var(--border-strong)" fill="none" strokeLinecap="round">
                <path d="M4 22 H96" strokeWidth="0.7" opacity=".55" />
                <path d="M4 40 H96" strokeWidth="0.7" opacity=".55" />
                <path d="M50 3 V67" strokeWidth="0.8" opacity=".6" />
                <path d="M22 5 V65" strokeWidth="0.5" opacity=".4" />
                <path d="M76 8 V62" strokeWidth="0.5" opacity=".4" />
                <path d="M8 58 Q34 46 62 56 T96 50" strokeWidth="0.6" opacity=".35" strokeDasharray="1.6 1.4" />
              </g>
              <rect width="100" height="70" fill="url(#vig)" />

              {zones.map((z) => {
                const c = statusColor[z.status];
                const r = 1.4 + (z.capacity / 950) * 2.1;
                const cx = z.x, cy = z.y * 0.7;
                const on = hover === z.id;
                return (
                  <g key={z.id} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)}
                    onClick={() => select(z.id)} tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && select(z.id)}>
                    <circle cx={cx} cy={cy} r={r * 3.4} fill={c} opacity={on ? 0.22 : 0.09}>
                      <animate attributeName="r" values={`${r * 2.4};${r * 3.8};${r * 2.4}`} dur="3.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={r} fill={c} stroke="var(--bg)" strokeWidth="0.35"
                      style={{ transition: "r .4s, fill .6s", filter: on ? `drop-shadow(0 0 3px ${c})` : "none" }} />
                    {z.event?.active && (
                      <circle cx={cx + r * 1.1} cy={cy - r * 1.1} r="0.8" fill="var(--amber)" />
                    )}
                    <text x={cx} y={cy - r - 1.4} textAnchor="middle" fontSize="2"
                      fill="var(--muted)" opacity={on ? 1 : 0.62} style={{ pointerEvents: "none", fontWeight: 600 }}>
                      {z.id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hz && (
              <div className="pointer-events-none absolute bottom-3 start-3 end-3 sm:end-auto sm:max-w-[290px]">
                <div className="glass card px-4 py-3 grow-in">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold">{hz.name[lang]}</span>
                    <span className="chip num" style={{ color: statusColor[hz.status], borderColor: statusColor[hz.status] }}>
                      {pct(hz.occupancy, lang)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted)] num">
                    <span>{fmt(hz.free, lang)} {t.zones.free}</span>
                    <span>{fmt(hz.effective_rate, lang)} {t.units.toman}/{t.units.hour}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 px-1 pb-1">
            {(["open", "moderate", "busy", "full"] as const).map((s) => (
              <span key={s} className="chip">
                <span className="h-2 w-2 rounded-full" style={{ background: statusColor[s] }} />
                {t.map.legend[s]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
