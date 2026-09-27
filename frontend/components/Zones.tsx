"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { statusColor, Zone } from "@/lib/api";
import { fmt, pct } from "@/lib/i18n";

function ZoneCard({ z, onOpen }: { z: Zone; onOpen: () => void }) {
  const { t, lang } = useApp();
  const c = statusColor[z.status];
  return (
    <button onClick={onOpen}
      className="glass card group relative w-full overflow-hidden p-4 text-start transition duration-300 hover:-translate-y-1"
      style={{ borderColor: "var(--border)" }}>
      <div className="absolute inset-x-0 top-0 h-[3px] transition-opacity duration-300"
        style={{ background: c, opacity: 0.85 }} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold">{z.name[lang]}</div>
          <div className="mt-0.5 text-[11px] text-[var(--muted)] num">
            {z.id} · {t.panel.district} {fmt(z.district, lang)} · {t.zones.kind[z.kind]}
          </div>
        </div>
        <span className="chip num shrink-0" style={{ color: c, borderColor: c }}>{pct(z.occupancy, lang)}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${z.occupancy * 100}%`, background: c }} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="num text-xl font-bold leading-none" style={{ color: c }}>{fmt(z.free, lang)}</div>
          <div className="text-[11px] text-[var(--muted)]">{t.zones.free}</div>
        </div>
        <div className="text-end">
          <div className="num text-[15px] font-bold leading-none">{fmt(z.effective_rate, lang)}</div>
          <div className="text-[11px] text-[var(--muted)]">{t.units.toman}/{t.units.hour}</div>
        </div>
      </div>

      {z.event?.active && (
        <div className="mt-3 rounded-xl px-2.5 py-1.5 text-[11px] font-medium"
          style={{ background: "var(--accent-soft)", color: "var(--amber)" }}>
          ⚡ {z.event.title[lang]}
        </div>
      )}
    </button>
  );
}

export default function Zones() {
  const { t, lang, zones, select } = useApp();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"occupancy" | "rate" | "free" | "name">("occupancy");
  const [kind, setKind] = useState<"all" | "street" | "garage">("all");
  const [onlyFree, setOnlyFree] = useState(false);

  const list = useMemo(() => {
    let items = zones.slice();
    const ql = q.trim().toLowerCase();
    if (ql) items = items.filter((z) => z.name.fa.includes(q.trim()) || z.name.en.toLowerCase().includes(ql) || z.id.toLowerCase().includes(ql));
    if (kind !== "all") items = items.filter((z) => z.kind === kind);
    if (onlyFree) items = items.filter((z) => z.occupancy < 0.9);
    const key = {
      occupancy: (z: Zone) => z.occupancy,
      rate: (z: Zone) => z.effective_rate,
      free: (z: Zone) => -z.free,
      name: (z: Zone) => z.name[lang],
    }[sort];
    return items.sort((a, b) => (key(a) > key(b) ? 1 : -1));
  }, [zones, q, sort, kind, onlyFree, lang]);

  return (
    <section id="zones" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal">
        <h2 className="text-[clamp(1.6rem,4.5vw,2.5rem)] font-extrabold tracking-[-0.02em]">{t.zones.title}</h2>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.zones.lead}</p>

        <div className="glass card mt-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.zones.search}
              className="field ps-10" aria-label={t.zones.search} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "street", "garage"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className="btn !py-1.5 !px-3 !text-[12px]"
                style={kind === k
                  ? { background: "var(--accent)", color: "#04140f" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                {t.zones.kind[k]}
              </button>
            ))}
            <button onClick={() => setOnlyFree((v) => !v)} className="btn !py-1.5 !px-3 !text-[12px]"
              style={onlyFree
                ? { background: "var(--violet)", color: "#fff" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              {t.zones.onlyAvailable}
            </button>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}
              className="field !w-auto !py-2 !text-[12px]" aria-label="sort">
              {(["occupancy", "rate", "free", "name"] as const).map((s) => (
                <option key={s} value={s}>{t.zones.sort[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="glass card mt-6 p-8 text-center text-sm text-[var(--muted)]">{t.zones.empty}</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((z) => <ZoneCard key={z.id} z={z} onOpen={() => select(z.id)} />)}
          </div>
        )}
      </div>
    </section>
  );
}
