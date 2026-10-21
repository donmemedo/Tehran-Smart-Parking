"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLive, usePrefs } from "@/lib/app";
import { fmt, pct } from "@/lib/i18n";

function Counter({ value, digits = 0 }: { value: number; digits?: number }) {
  const { lang } = usePrefs();
  const [v, setV] = useState(0);
  const cur = useRef(0); // latest displayed value, so a new target starts from where the number is now

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { cur.current = value; setV(value); return; }
    let raf = 0, start = 0;
    const from = cur.current, delta = value - from, dur = 900;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      cur.current = from + delta * (1 - Math.pow(1 - p, 3));
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const fallback = setTimeout(() => { cur.current = value; setV(value); }, dur + 400); // headless / throttled tabs
    return () => { cancelAnimationFrame(raf); clearTimeout(fallback); };
  }, [value]);

  return <>{fmt(v, lang, digits)}</>;
}

/* Only the badge dot reads the connection state. */
function LiveBadge() {
  const { t } = usePrefs();
  const live = useLive((s) => s.live);
  return (
    <span className="chip grow-in">
      <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: live ? "var(--accent)" : "var(--amber)" }} />
      {t.hero.badge}
    </span>
  );
}

/* Only the stat cards read the overview, so socket frames re-render these four cards and nothing else. */
function Stats() {
  const { t, lang } = usePrefs();
  const o = useLive((s) => s.overview);

  const stats = [
    { label: t.hero.s1, value: <Counter value={o?.free ?? 0} />, unit: t.units.space, color: "var(--accent)" },
    { label: t.hero.s2, value: o ? pct(o.occupancy, lang) : "—", unit: "", color: "var(--violet)" },
    { label: t.hero.s3, value: <Counter value={o?.search_time_saved_min ?? 0} digits={1} />, unit: t.hero.minute, color: "var(--amber)" },
    { label: t.hero.s4, value: o ? pct(o.sensor_health, lang) : "—", unit: "", color: "var(--accent)" },
  ];

  return (
    <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div key={i} className="glass card relative overflow-hidden p-4 sm:p-5 grow-in"
          style={{ animationDelay: `${0.3 + i * 0.07}s` }}>
          <div className="absolute -top-8 -end-8 h-24 w-24 rounded-full blur-2xl opacity-40"
            style={{ background: s.color }} aria-hidden />
          <div className="text-[12px] font-medium text-[var(--muted)]">{s.label}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="num t-title text-[clamp(1.5rem,4.5vw,2.1rem)] font-bold !leading-none">{s.value}</span>
            {s.unit && <span className="text-[11px] text-[var(--muted)]">{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Hero() {
  const { t } = usePrefs();

  return (
    <section className="relative mx-auto max-w-[1180px] px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
      <div className="max-w-[760px]">
        <LiveBadge />

        <h1 className="t-display mt-5 text-[clamp(2.4rem,7vw,4.6rem)] font-extrabold">
          <span className="block grow-in">{t.hero.title1}</span>
          <span className="block grow-in" style={{ animationDelay: ".08s" }}>
            <span style={{
              background: "linear-gradient(110deg, var(--accent), var(--violet) 60%, var(--amber))",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}>
              {t.hero.title2}
            </span>{" "}
            {t.hero.title3}
          </span>
        </h1>

        <p className="mt-5 max-w-[56ch] text-[clamp(.98rem,2.2vw,1.13rem)] leading-relaxed text-[var(--muted)] grow-in"
          style={{ animationDelay: ".16s" }}>
          {t.hero.lead}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3 grow-in" style={{ animationDelay: ".24s" }}>
          <a href="#map" className="btn btn-primary">
            {t.cta.start}
            <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <Link href="/dashboard" className="btn btn-ghost">{t.cta.dashboard}</Link>
        </div>
      </div>

      <Stats />
    </section>
  );
}
