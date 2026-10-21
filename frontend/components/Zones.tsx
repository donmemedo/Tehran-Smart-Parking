"use client";
import { memo, useMemo, useState } from "react";
import { useLive, useLiveActions, usePrefs } from "@/lib/app";
import { statusColor, type Zone } from "@/lib/api";
import { fmt, foldSearch, pct, type Lang } from "@/lib/i18n";

const SORTS = ["occupancy", "rate", "free", "name"] as const;
const KINDS = ["all", "street", "garage"] as const;
type SortKey = (typeof SORTS)[number];
type Kind = (typeof KINDS)[number];
const isSort = (v: string): v is SortKey => (SORTS as readonly string[]).includes(v);

/* Memoised: a socket frame hands over the same object for every zone that did not change, so only
   the cards whose numbers moved re-render. */
const ZoneCard = memo(function ZoneCard({ z, onOpen }: { z: Zone; onOpen: (id: string, opener?: Element) => void }) {
  const { t, lang } = usePrefs();
  const c = statusColor[z.status];
  return (
    <button onClick={(e) => onOpen(z.id, e.currentTarget)} aria-haspopup="dialog"
      className="glass card group relative w-full overflow-hidden p-4 text-start transition-[transform,box-shadow] duration-300 hover:-translate-y-1"
      style={{ borderColor: "var(--border)" }}>
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: c, opacity: 0.85 }} aria-hidden />
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
        <div className="bar-fill h-full w-full rounded-full"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, z.occupancy))})`, background: c }} />
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
});

/* The only part of this section that reads live zones. The toolbar above it is plain local state. */
const ZoneList = memo(function ZoneList({ q, sort, kind, onlyFree }: {
  q: string; sort: SortKey; kind: Kind; onlyFree: boolean;
}) {
  const { t, lang } = usePrefs();
  const zones = useLive((s) => s.zones);
  const loaded = useLive((s) => s.loaded);
  const { select } = useLiveActions();

  const list = useMemo(() => {
    let items = zones.slice();
    const needle = foldSearch(q);
    if (needle) {
      items = items.filter((z) =>
        foldSearch(z.name.fa).includes(needle) ||
        foldSearch(z.name.en).includes(needle) ||
        z.id.toLowerCase().includes(needle));
    }
    if (kind !== "all") items = items.filter((z) => z.kind === kind);
    if (onlyFree) items = items.filter((z) => z.occupancy < 0.9);
    const by = (l: Lang): Record<SortKey, (a: Zone, b: Zone) => number> => ({
      occupancy: (a, b) => a.occupancy - b.occupancy,
      rate: (a, b) => a.effective_rate - b.effective_rate,
      free: (a, b) => b.free - a.free,
      name: (a, b) => a.name[l].localeCompare(b.name[l], l),
    });
    const cmp = by(lang)[sort];
    return items.sort((a, b) => cmp(a, b) || a.id.localeCompare(b.id));
  }, [zones, q, sort, kind, onlyFree, lang]);

  if (!loaded) { // nothing has arrived yet: a skeleton, not "nothing found"
    return (
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-busy="true">
        <span className="sr-only">{t.panel.loading}</span>
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="glass card h-[142px]" aria-hidden />)}
      </div>
    );
  }
  if (list.length === 0) {
    return <p className="glass card mt-6 p-8 text-center text-sm text-[var(--muted)]" role="status">{t.zones.empty}</p>;
  }
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((z) => <ZoneCard key={z.id} z={z} onOpen={select} />)}
    </div>
  );
});

export default function Zones() {
  const { t } = usePrefs();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("occupancy");
  const [kind, setKind] = useState<Kind>("all");
  const [onlyFree, setOnlyFree] = useState(false);

  const off = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" };

  return (
    <section id="zones" className="mx-auto max-w-[1180px] px-4 py-10 sm:py-16">
      <div className="reveal">
        <h2 className="t-title text-[clamp(1.6rem,4.5vw,2.5rem)] font-extrabold">{t.zones.title}</h2>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.zones.lead}</p>

        <div className="glass card mt-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
            </svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.zones.search}
              autoComplete="off" enterKeyHint="search" spellCheck={false}
              className="field ps-10" aria-label={t.zones.searchLabel} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {KINDS.map((k) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                className="btn !py-1.5 !px-3 !text-[12px]"
                style={kind === k ? { background: "var(--accent)", color: "var(--on-accent)" } : off}>
                {t.zones.kind[k]}
              </button>
            ))}
            <button onClick={() => setOnlyFree((v) => !v)} aria-pressed={onlyFree} className="btn !py-1.5 !px-3 !text-[12px]"
              style={onlyFree ? { background: "var(--violet)", color: "#fff" } : off}>
              {t.zones.onlyAvailable}
            </button>
            <select value={sort} onChange={(e) => { const v = e.target.value; if (isSort(v)) setSort(v); }}
              className="field !w-auto !py-2 !text-[12px]" aria-label={t.zones.sortLabel}>
              {SORTS.map((s) => (
                <option key={s} value={s}>{t.zones.sort[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <ZoneList q={q} sort={sort} kind={kind} onlyFree={onlyFree} />
      </div>
    </section>
  );
}
