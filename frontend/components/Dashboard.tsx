"use client";
import { memo, useMemo } from "react";
import { useLive, useLiveActions, usePolling, usePrefs } from "@/lib/app";
import { statusColor, type Zone } from "@/lib/api";
import { fmt, pct } from "@/lib/i18n";
import { Bars, Ring, Spark } from "./Charts";

/* Decorative trace derived from the zone's current occupancy; memoised so it only recomputes when
   the zone's numbers move. */
const FeedRow = memo(function FeedRow({ z }: { z: Zone }) {
  const { lang } = usePrefs();
  const data = useMemo(
    () => Array.from({ length: 14 }, (_, i) => z.occupancy * (0.82 + 0.05 * Math.sin(i + z.x))),
    [z.occupancy, z.x],
  );
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="truncate font-semibold">{z.name[lang]}</span>
        <span className="num text-[var(--muted)]">{fmt(z.effective_rate, lang)}</span>
      </div>
      <Spark data={data} color={statusColor[z.status]} height={48} />
    </div>
  );
});

export default function Dashboard() {
  const { t, lang } = usePrefs();
  const o = useLive((s) => s.overview);
  const zones = useLive((s) => s.zones);
  const events = useLive((s) => s.events);
  const { refreshOverview, refreshEvents } = useLiveActions();
  const hour = new Date().getHours();
  const busiest = useMemo(() => zones.slice().sort((a, b) => b.occupancy - a.occupancy).slice(0, 6), [zones]);
  const feed = useMemo(() => zones.slice(0, 3), [zones]);

  // Socket frames only carry per-zone occupancy. Revenue, rates, CO2, sensor health, the day curve
  // and events come from REST, so refresh them on open and every 30 s (paused while the tab is hidden).
  usePolling(() => Promise.all([refreshOverview(), refreshEvents()]), 30_000);

  const kpis = o
    ? [
        [t.dash.kpi.capacity, fmt(o.capacity, lang), t.units.space, "var(--violet)"],
        [t.dash.kpi.occupied, fmt(o.occupied, lang), pct(o.occupancy, lang), "var(--accent)"],
        [t.dash.kpi.revenue, fmt(o.revenue_today / 1000, lang, 1), t.dash.million, "var(--amber)"],
        [t.dash.kpi.rate, fmt(o.avg_rate, lang), t.units.toman, "var(--accent)"],
        [t.dash.kpi.co2, fmt(o.co2_saved_kg, lang, 1), t.dash.kg, "var(--violet)"],
        [t.dash.kpi.health, pct(o.sensor_health, lang), `${fmt(o.sensors.online, lang)}/${fmt(o.sensors.total, lang)}`, "var(--accent)"],
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-6">
      <div className="reveal in">
        <h1 className="t-display text-[clamp(1.8rem,5vw,2.8rem)] font-extrabold">{t.dash.title}</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.dash.lead}</p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map(([label, value, unit, color], i) => (
          <div key={i} className="glass card relative overflow-hidden p-4 sm:p-5 grow-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="absolute -top-10 -end-10 h-28 w-28 rounded-full opacity-25 blur-2xl" style={{ background: color as string }} />
            <div className="text-[12px] text-[var(--muted)]">{label}</div>
            <div className="num t-title mt-2 text-[clamp(1.4rem,4vw,2rem)] font-extrabold !leading-none">{value}</div>
            <div className="mt-1 text-[11px] text-[var(--muted)] num">{unit}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{t.dash.curve}</h2>
            {o && <span className="chip num">{pct(o.occupancy, lang)}</span>}
          </div>
          <div className="mt-6 pb-6">
            <Bars
              data={(o?.curve ?? []).map((c) => c.occupancy)}
              labels={(o?.curve ?? []).map((c) => String(c.hour).padStart(2, "0"))}
              highlight={hour}
              height={170}
            />
          </div>
        </div>

        <div className="glass card p-5 sm:p-6">
          <h2 className="text-base font-bold">{t.dash.top}</h2>
          <ul className="mt-4 grid gap-2.5">
            {busiest.map((z) => (
              <li key={z.id} className="flex items-center gap-3">
                <span className="num w-9 shrink-0 text-[11px] text-[var(--muted)]">{z.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{z.name[lang]}</span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
                    <span className="bar-fill block h-full w-full rounded-full"
                      style={{ transform: `scaleX(${Math.min(1, Math.max(0, z.occupancy))})`, background: statusColor[z.status] }} />
                  </span>
                </span>
                <span className="num shrink-0 text-[12px] font-bold" style={{ color: statusColor[z.status] }}>
                  {pct(z.occupancy, lang)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="glass card p-5 sm:p-6">
          <h2 className="text-base font-bold">{t.dash.kpi.health}</h2>
          <div className="mt-5 flex items-center gap-5">
            <Ring value={o?.sensor_health ?? 0} label={o ? pct(o.sensor_health, lang) : "—"} size={104} />
            <div className="text-[12px] text-[var(--muted)] num leading-relaxed">
              {o && <>{fmt(o.sensors.online, lang)} / {fmt(o.sensors.total, lang)}</>}
            </div>
          </div>
        </div>

        <div className="glass card p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-base font-bold">{t.dash.events}</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-[18px] border p-3.5 hairline" style={{ background: "var(--surface)" }}>
                <div className="text-[13px] font-semibold leading-snug">{e.title[lang]}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)] num">
                  <span>{e.zone_id} · ×{e.multiplier}</span>
                  <span style={{ color: e.active ? "var(--accent)" : undefined }}>
                    {e.active ? t.pricing.running : `${fmt(Math.max(0, e.starts_in_min ?? 0), lang)} ${t.pricing.soon}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass card mt-4 p-5 sm:p-6">
        <h2 className="text-base font-bold">{t.dash.feed}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {feed.map((z) => <FeedRow key={z.id} z={z} />)}
        </div>
      </div>
    </div>
  );
}
