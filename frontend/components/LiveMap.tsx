"use client";
import { memo, useCallback, useState } from "react";
import { useLive, useLiveActions, usePrefs } from "@/lib/app";
import { statusColor, type Zone } from "@/lib/api";
import { fmt, pct } from "@/lib/i18n";

/* One map marker. Memoised so a frame only repaints the dots whose zone actually changed. */
const ZoneDot = memo(function ZoneDot({ z, i, on, onHover, onOpen }: {
  z: Zone; i: number; on: boolean;
  onHover: (id: string | null) => void; onOpen: (id: string, opener?: Element) => void;
}) {
  const { lang } = usePrefs();
  const c = statusColor[z.status];
  const r = 1.4 + (z.capacity / 950) * 2.1;
  const cx = z.x, cy = z.y * 0.7;
  return (
    <g style={{ cursor: "pointer" }} role="button" tabIndex={0}
      aria-label={`${z.name[lang]} — ${pct(z.occupancy, lang)}`}
      onMouseEnter={() => onHover(z.id)} onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(z.id)} onBlur={() => onHover(null)}
      onClick={(e) => onOpen(z.id, e.currentTarget)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(z.id, e.currentTarget); } }}>
      {/* soft halo: pulses with transform only (CSS), never by animating r */}
      <circle className="zone-pulse" cx={cx} cy={cy} r={r * 3.4} fill={c} opacity={on ? 0.22 : 0.09}
        style={{ animationDelay: `${-(i % 9) * 0.4}s` }} />
      <circle cx={cx} cy={cy} r={r} fill={c} stroke="var(--bg)" strokeWidth="0.35"
        style={{ transition: "fill .6s", filter: on ? `drop-shadow(0 0 3px ${c})` : "none" }} />
      {z.event?.active && (
        <circle cx={cx + r * 1.1} cy={cy - r * 1.1} r="0.8" fill="var(--amber)" />
      )}
      <text x={cx} y={cy - r - 1.4} textAnchor="middle" fontSize="2"
        fill="var(--muted)" opacity={on ? 1 : 0.62} style={{ pointerEvents: "none", fontWeight: 600 }}>
        {z.id}
      </text>
    </g>
  );
});

function LiveChip() {
  const { t } = usePrefs();
  const live = useLive((s) => s.live);
  return (
    <span className="chip" role="status">
      <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: live ? "var(--accent)" : "var(--amber)" }} />
      {live ? t.map.live : t.map.offline}
    </span>
  );
}

function HoverCard({ id }: { id: string }) {
  const { t, lang } = usePrefs();
  const hz = useLive((s) => s.zones.find((z) => z.id === id));
  if (!hz) return null;
  return (
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
  );
}

export default function LiveMap() {
  const { t } = usePrefs();
  const zones = useLive((s) => s.zones);
  const { select } = useLiveActions();
  const [hover, setHover] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHover(id), []);

  return (
    <section id="map" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="t-title text-[clamp(1.6rem,4.5vw,2.5rem)] font-extrabold">{t.map.title}</h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.map.lead}</p>
          </div>
          <LiveChip />
        </div>

        <div className="glass card mt-6 overflow-hidden p-2 sm:p-4">
          <div className="relative w-full overflow-hidden rounded-[18px]"
            style={{ aspectRatio: "16 / 11", background: "linear-gradient(160deg, var(--bg-2), transparent)" }}>
            <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" role="group" aria-label={t.map.title}>
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

              {zones.map((z, i) => (
                <ZoneDot key={z.id} z={z} i={i} on={hover === z.id} onHover={onHover} onOpen={select} />
              ))}
            </svg>

            {hover && <HoverCard id={hover} />}
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
