"use client";
import { useApp } from "@/lib/app";
import { fmt, pct } from "@/lib/i18n";

export default function Pricing() {
  const { t, lang, events, zones } = useApp();
  const rules = [
    { icon: "↑", text: t.pricing.up, color: "var(--rose)" },
    { icon: "=", text: t.pricing.hold, color: "var(--accent)" },
    { icon: "↓", text: t.pricing.down, color: "var(--violet)" },
  ];

  return (
    <section id="pricing" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="glass card relative overflow-hidden p-6 sm:p-8">
          <h2 className="text-[clamp(1.6rem,4.5vw,2.4rem)] font-extrabold tracking-[-0.02em]">{t.pricing.title}</h2>
          <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.pricing.lead}</p>

          <div className="mt-6 grid gap-2.5">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[18px] border p-3.5 hairline"
                style={{ background: "var(--surface)" }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                  style={{ background: "var(--accent-soft)", color: r.color }}>{r.icon}</span>
                <span className="text-[13px] font-medium leading-snug">{r.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] border p-4 hairline">
              <div className="text-[11px] text-[var(--muted)]">{t.pricing.target}</div>
              <div className="num mt-1 text-xl font-extrabold">{pct(0.7, lang)} – {pct(0.85, lang)}</div>
            </div>
            <div className="rounded-[18px] border p-4 hairline">
              <div className="text-[11px] text-[var(--muted)]">{t.pricing.step}</div>
              <div className="num mt-1 text-xl font-extrabold">{fmt(1000, lang)} <span className="text-[11px] font-normal text-[var(--muted)]">{t.units.toman}</span></div>
            </div>
          </div>
        </div>

        <div className="glass card p-6 sm:p-8">
          <h3 className="text-lg font-extrabold">{t.pricing.event}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{t.pricing.eventLead}</p>
          <ul className="mt-5 grid gap-3">
            {events.map((e) => {
              const z = zones.find((x) => x.id === e.zone_id);
              return (
                <li key={e.id} className="rounded-[18px] border p-4 hairline" style={{ background: "var(--surface)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[13px] font-semibold leading-snug">{e.title[lang]}</span>
                    <span className="chip num shrink-0" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
                      ×{e.multiplier}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)] num">
                    <span>{z ? z.name[lang] : e.zone_id}</span>
                    <span>
                      {e.active
                        ? t.pricing.running
                        : `${fmt(Math.max(0, e.starts_in_min ?? 0), lang)} ${t.pricing.soon}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
