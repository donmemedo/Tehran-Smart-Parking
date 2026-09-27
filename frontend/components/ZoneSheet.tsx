"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app";
import { api, statusColor, ZoneDetail } from "@/lib/api";
import { fmt, pct } from "@/lib/i18n";
import { Spark, Ring } from "./Charts";

export default function ZoneSheet() {
  const { t, lang, selected, select, refreshWallet } = useApp();
  const [z, setZ] = useState<ZoneDetail | null>(null);
  const [plate, setPlate] = useState("");
  const [mins, setMins] = useState(60);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setZ(null); setMsg(null);
    if (!selected) return;
    api.zone(selected).then(setZ).catch(() => {});
    const i = setInterval(() => api.zone(selected!).then(setZ).catch(() => {}), 8000);
    return () => clearInterval(i);
  }, [selected]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [selected, select]);

  if (!selected) return null;
  const c = z ? statusColor[z.status] : "var(--accent)";
  const cost = z ? Math.round((z.effective_rate * mins) / 60) : 0;

  const pay = async () => {
    if (!z) return;
    setBusy(true); setMsg(null);
    try {
      const s = await api.startSession(z.id, plate || "IR-0000", mins);
      setMsg({ kind: "ok", text: `${t.panel.success} · ${s.id}` });
      refreshWallet();
      api.zone(z.id).then(setZ).catch(() => {});
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message === "402" ? t.panel.noMoney : e?.message === "409" ? t.panel.full : "error" });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => select(null)} aria-hidden
        style={{ animation: "growIn .3s both" }} />
      <aside
        className="glass relative flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-[28px] sm:max-h-none sm:h-full sm:w-[440px] sm:rounded-none sm:rounded-s-[28px]"
        style={{ animation: "growIn .42s cubic-bezier(.2,.9,.25,1.02) both" }} role="dialog" aria-modal>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b p-5 hairline"
          style={{ background: "var(--surface)", backdropFilter: "blur(20px)" }}>
          <div className="min-w-0">
            <div className="truncate text-xl font-extrabold tracking-tight">{z ? z.name[lang] : selected}</div>
            {z && (
              <div className="mt-1 text-[12px] text-[var(--muted)] num">
                {z.id} · {t.panel.district} {fmt(z.district, lang)} · {t.zones.kind[z.kind]}
              </div>
            )}
          </div>
          <button onClick={() => select(null)} className="btn btn-ghost !p-2" aria-label={t.cta.close}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {!z ? (
          <div className="grid flex-1 place-items-center p-10 text-sm text-[var(--muted)]">…</div>
        ) : (
          <div className="grid gap-4 p-5">
            <div className="flex items-center gap-4 rounded-[20px] border p-4 hairline" style={{ background: "var(--surface)" }}>
              <Ring value={z.occupancy} color={c} label={pct(z.occupancy, lang)} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-[var(--muted)]">{t.panel.rateNow}</div>
                <div className="num text-[26px] font-extrabold leading-none" style={{ color: c }}>
                  {fmt(z.effective_rate, lang)}
                </div>
                <div className="text-[11px] text-[var(--muted)]">{t.panel.perHour}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] num text-[var(--muted)]">
                  <span className="chip">{fmt(z.free, lang)} {t.zones.free}</span>
                  <span className="chip">{t.panel.base} {fmt(z.base_rate, lang)}</span>
                </div>
              </div>
            </div>

            {z.event?.active && (
              <div className="rounded-[18px] p-3 text-[12px] font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--amber)" }}>
                ⚡ {t.panel.eventNow} — {z.event.title[lang]} (×{z.event.multiplier})
              </div>
            )}

            <div className="rounded-[20px] border p-4 hairline">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="font-semibold">{t.panel.history}</span>
                <span className="num text-[var(--muted)]">{pct(z.history[z.history.length - 1]?.occupancy ?? 0, lang)}</span>
              </div>
              <Spark data={z.history.map((h) => h.occupancy)} color={c} height={70} />
              <div className="mt-4 mb-2 flex items-center justify-between text-[12px]">
                <span className="font-semibold">{t.panel.forecast}</span>
              </div>
              <Spark data={z.forecast.map((f) => f.occupancy)} color="var(--violet)" height={56} dots />
            </div>

            {z.rate_changes.length > 0 && (
              <div className="rounded-[20px] border p-4 hairline">
                <div className="mb-2 text-[12px] font-semibold">{t.panel.changes}</div>
                <ul className="grid gap-1.5">
                  {z.rate_changes.slice(0, 5).map((r, i) => (
                    <li key={i} className="flex items-center justify-between text-[12px] num">
                      <span className="text-[var(--muted)]">{new Date(r.t).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span style={{ color: r.to > r.from ? "var(--rose)" : "var(--accent)" }}>
                        {fmt(r.from, lang)} → {fmt(r.to, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                [t.panel.sensors, `${fmt(z.sensors.online, lang)}/${fmt(z.sensors.total, lang)}`],
                [t.panel.revenue, `${fmt(z.revenue_today / 1000, lang, 1)} ${t.dash.million}`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-[18px] border p-3 hairline">
                  <div className="text-[11px] text-[var(--muted)]">{k}</div>
                  <div className="num mt-1 text-sm font-bold">{v}</div>
                </div>
              ))}
            </div>

            {/* session */}
            <div className="rounded-[20px] border p-4 hairline" style={{ background: "var(--surface)" }}>
              <div className="text-[13px] font-bold">{t.panel.start}</div>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder={t.panel.plate}
                className="field mt-3" aria-label={t.panel.plate} />
              <div className="mt-3 flex flex-wrap gap-2">
                {[30, 60, 120, 180].map((m) => (
                  <button key={m} onClick={() => setMins(m)} className="btn !py-1.5 !px-3 !text-[12px] num"
                    style={mins === m
                      ? { background: "var(--accent)", color: "#04140f" }
                      : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                    {fmt(m, lang)} {t.units.min}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px] text-[var(--muted)]">{t.panel.amount}</span>
                <span className="num text-lg font-extrabold">{fmt(cost, lang)} <span className="text-[11px] font-normal text-[var(--muted)]">{t.units.toman}</span></span>
              </div>
              <button onClick={pay} disabled={busy || z.free <= 0} className="btn btn-primary mt-3 w-full disabled:opacity-50">
                {z.free <= 0 ? t.panel.full : t.panel.pay}
              </button>
              {msg && (
                <div className="mt-3 rounded-xl px-3 py-2 text-[12px] font-medium"
                  style={{ background: "var(--accent-soft)", color: msg.kind === "ok" ? "var(--accent)" : "var(--rose)" }}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
