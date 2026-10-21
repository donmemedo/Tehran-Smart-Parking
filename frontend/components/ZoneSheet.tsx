"use client";
import {
  useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ApiError, PLATE_MAX, PLATE_MIN, PLATE_RE, api, normalizePlate, sessionCost, statusColor,
  type ZoneDetail,
} from "@/lib/api";
import { useLive, useLiveActions, usePolling, usePrefs, useSelected } from "@/lib/app";
import { fmt, pct, tpl, type Dict } from "@/lib/i18n";
import { animateSpring, project, rubberband } from "@/lib/spring";
import { Spark, Ring } from "./Charts";

/* ──────────────────────────────────────────────────────────────────────────
   Zone sheet.

   Motion (Apple, "Designing Fluid Interfaces"):
   - one number drives everything: `offset` = distance travelled toward the closed position, in px.
     0 = fully open, `closed` = fully off-screen. Transform and opacity are the only animated
     properties, and both are written straight to the DOM from the spring, never through React.
   - open and close are damped springs. Grabbing the sheet mid-flight stops the spring where it is
     and the finger takes over from that exact value (no jump, 1:1 tracking).
   - release: velocity comes from the last few pointer samples, the flick is projected to where it
     would come to rest, and the nearest rest position wins. The release velocity is handed to the
     next spring, so the motion stays continuous.
   - dragging past the open position rubber-bands.
   - mobile: slides up from the bottom. sm and up: slides in from the inline-end edge (right in LTR,
     left in RTL) and leaves by the same path.
   - prefers-reduced-motion: no slide, no spring, no drag; a short opacity cross-fade instead.
   ────────────────────────────────────────────────────────────────────────── */

type Dim = {
  axis: "x" | "y";
  /** +1 when the closing direction is +x / +y on screen, -1 for the RTL side sheet */
  sign: 1 | -1;
  /** the sheet's own extent along the axis */
  size: number;
  /** offset at which the sheet (and its shadow) is completely off-screen */
  closed: number;
};

const SHADOW_BLEED = 80;
const DRAG_SLOP = 10;
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- payment errors ---------- */

type ErrKey = keyof Dict["panel"]["err"];

function classify(e: unknown, free: number): { key: ErrKey; wait: number } {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 401: return { key: "auth", wait: 0 };
      case 402: return { key: "funds", wait: 0 };
      case 409: {
        const d = (e.detail ?? "").toLowerCase();
        const full = d.includes("full") ? true : d.includes("too many") ? false : free <= 0;
        return { key: full ? "full" : "tooMany", wait: 0 };
      }
      case 422: return { key: "invalid", wait: 0 };
      case 429: return { key: "rate", wait: e.retryAfter && e.retryAfter > 0 ? e.retryAfter : 0 };
      default: return { key: "generic", wait: 0 };
    }
  }
  return { key: "network", wait: 0 }; // fetch() itself failed
}

type Result =
  | { kind: "ok"; id: string }
  | { kind: "err"; key: ErrKey; counting: boolean };

/* ---------- outer shell: owns mount/unmount so the exit animation can finish ---------- */

export default function ZoneSheet() {
  const selected = useSelected();
  const { select } = useLiveActions();
  const [shown, setShown] = useState<string | null>(null);
  // `selected` lives in the global store; clear it when the page goes away so Back never reopens it.
  useEffect(() => () => select(null), [select]);
  if (selected && selected !== shown) setShown(selected);
  if (!shown) return null;
  return <SheetPanel id={shown} open={selected !== null} onExited={() => setShown(null)} />;
}

/* ---------- the sheet ---------- */

function SheetPanel({ id, open, onExited }: { id: string; open: boolean; onExited: () => void }) {
  const { t, lang } = usePrefs();
  const { select, refreshWallet, getOpener } = useLiveActions();
  const titleId = useId();
  const plateId = useId();
  const hintId = useId();
  const errId = useId();

  /* ----- motion state (refs: never re-render per frame) ----- */
  const frameRef = useRef<HTMLDivElement>(null); // the moving unit (sheet + bleed)
  const dialogRef = useRef<HTMLElement>(null); // the scroller with role=dialog
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const offset = useRef(0);
  const dim = useRef<Dim>({ axis: "y", sign: 1, size: 0, closed: 0 });
  const target = useRef<"open" | "closed">("closed");
  const stopSpring = useRef<(() => void) | null>(null);
  const fades = useRef<Animation[]>([]);
  const exited = useRef(false);
  const openRef = useRef(open);
  const onExitedRef = useRef(onExited);
  const idRef = useRef(id);
  const openerRef = useRef<Element | null>(null);
  useLayoutEffect(() => { openRef.current = open; onExitedRef.current = onExited; idRef.current = id; });

  const measure = useCallback((): Dim => {
    const el = frameRef.current;
    if (!el) return dim.current;
    const desktop = window.matchMedia("(min-width: 640px)").matches;
    const rtl = getComputedStyle(el).direction === "rtl";
    const size = desktop ? el.offsetWidth : el.offsetHeight; // layout size: unaffected by transforms
    dim.current = { axis: desktop ? "x" : "y", sign: desktop && rtl ? -1 : 1, size, closed: size + SHADOW_BLEED };
    return dim.current;
  }, []);

  /** Present `v` px of travel toward closed (negative = rubber-banded past open). */
  const apply = useCallback((v: number) => {
    offset.current = v;
    const el = frameRef.current;
    const bd = backdropRef.current;
    if (!el || !bd) return;
    const { axis, sign, closed } = dim.current;
    el.style.transform = v === 0 ? "" : axis === "y" ? `translate3d(0,${v}px,0)` : `translate3d(${sign * v}px,0,0)`;
    bd.style.opacity = String(Math.min(1, Math.max(0, 1 - v / closed)));
  }, []);

  const finishExit = useCallback(() => {
    if (openRef.current || exited.current) return;
    exited.current = true;
    onExitedRef.current();
  }, []);

  const settle = useCallback((to: "open" | "closed", velocity = 0, flick = false) => {
    stopSpring.current?.();
    target.current = to;
    const goal = to === "open" ? 0 : dim.current.closed;
    stopSpring.current = animateSpring({
      from: offset.current,
      to: goal,
      velocity,
      rest: 0.4,
      dampingRatio: flick ? 0.8 : 1,
      response: flick ? 0.3 : to === "open" ? 0.35 : 0.3,
      onUpdate: (x) => {
        if (to === "closed" && x >= goal - 0.5) { // first arrival is enough; skip the invisible overshoot tail
          apply(goal);
          stopSpring.current?.();
          finishExit();
          return;
        }
        apply(x);
      },
      onRest: () => { if (to === "closed") finishExit(); },
    });
  }, [apply, finishExit]);

  /** Reduced motion: a short opacity cross-fade (Web Animations API, so it is not caught by the CSS kill-switch). */
  const fade = useCallback((to: 0 | 1) => {
    target.current = to ? "open" : "closed";
    const els = [frameRef.current, backdropRef.current].filter((e): e is HTMLDivElement => e !== null);
    const froms = els.map((el) => Number.parseFloat(getComputedStyle(el).opacity) || 0);
    fades.current.forEach((a) => a.cancel());
    fades.current = [];
    const done = () => {
      els.forEach((el) => { el.style.opacity = String(to); });
      if (!to) finishExit();
    };
    if (els.length === 0 || typeof els[0].animate !== "function") { done(); return; }
    const anims = els.map((el, i) =>
      el.animate([{ opacity: froms[i] }, { opacity: to }], { duration: 160, easing: "linear", fill: "forwards" }));
    fades.current = anims;
    anims[0].onfinish = done;
  }, [finishExit]);

  const go = useCallback((to: "open" | "closed") => {
    if (reducedMotion()) fade(to === "open" ? 1 : 0);
    else settle(to);
  }, [fade, settle]);

  /* enter: place the sheet off-screen before the first paint, then spring in */
  useLayoutEffect(() => {
    exited.current = false;
    measure();
    if (reducedMotion()) {
      frameRef.current?.style.setProperty("opacity", "0");
      backdropRef.current?.style.setProperty("opacity", "0");
      fade(1);
    } else {
      apply(dim.current.closed);
      settle("open");
    }
    return () => {
      stopSpring.current?.();
      stopSpring.current = null;
      fades.current.forEach((a) => a.cancel());
      fades.current = [];
    };
  }, [measure, apply, settle, fade]);

  /* the store flipped `selected`: close (or re-open if the user changed their mind mid-exit) */
  useEffect(() => {
    if (open && target.current === "closed") go("open");
    else if (!open && target.current === "open") go("closed");
  }, [open, go]);

  /* ----- dialog behaviour: scroll lock, inert background, focus in/out, Escape ----- */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    openerRef.current = getOpener();
    const opener = openerRef.current;
    const app = document.getElementById("app-root");
    const html = document.documentElement;
    const body = document.body;
    const prev = { h: html.style.overflow, b: body.style.overflow, p: body.style.paddingInlineEnd };
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingInlineEnd = `${scrollbar}px`; // no layout shift when the scrollbar goes
    app?.setAttribute("inert", "");
    (closeRef.current ?? dialog).focus({ preventScroll: true });

    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof Node && !dialog.contains(e.target)) (closeRef.current ?? dialog).focus({ preventScroll: true });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); select(null); }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKey);
      app?.removeAttribute("inert");
      html.style.overflow = prev.h;
      body.style.overflow = prev.b;
      body.style.paddingInlineEnd = prev.p;
      if ((opener instanceof HTMLElement || opener instanceof SVGElement) && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [getOpener, select]);

  const trapTab = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.getClientRects().length > 0);
    if (items.length === 0) { e.preventDefault(); root.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === root)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  /* ----- drag to dismiss (grabber + header) ----- */
  const drag = useRef<{
    pointer: number; start: number; from: number; committed: boolean; samples: { t: number; p: number }[];
  } | null>(null);

  /** pointer position along the closing axis, positive = toward closed */
  const along = (e: ReactPointerEvent) =>
    dim.current.axis === "y" ? e.clientY : e.clientX * dim.current.sign;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as Element).closest("button, a, input, select, textarea")) return;
    measure();
    stopSpring.current?.(); // grab: freeze at the presented value
    const p = along(e);
    drag.current = { pointer: e.pointerId, start: p, from: offset.current, committed: false, samples: [{ t: e.timeStamp, p }] };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointer) return;
    const p = along(e);
    d.samples.push({ t: e.timeStamp, p });
    if (d.samples.length > 6) d.samples.shift();
    if (!d.committed) {
      if (Math.abs(p - d.start) < DRAG_SLOP) return; // hysteresis: a tap or a twitch is not a drag
      d.committed = true;
    }
    const raw = d.from + (p - d.start); // keeps the grab offset: the sheet never jumps under the finger
    apply(raw < 0 ? -rubberband(-raw, dim.current.closed) : raw);
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointer) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d.committed) { settle(target.current); return; } // it was a tap: carry on where we were

    let v = 0; // px/s toward closed, from the samples of the last 100ms
    const recent = d.samples.filter((s) => e.timeStamp - s.t <= 100);
    if (!cancelled && recent.length >= 2) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      if (b.t > a.t) v = ((b.p - a.p) / (b.t - a.t)) * 1000;
    }
    const { size } = dim.current;
    const dismiss = offset.current + project(v) > size / 2;
    if (dismiss) {
      settle("closed", v, true);
      if (openRef.current) select(null);
    } else {
      settle("open", v, true);
      if (!openRef.current) select(idRef.current); // caught the sheet mid-exit and let it go back
    }
  };

  /* ----- data ----- */
  const [z, setZ] = useState<ZoneDetail | null>(null);
  const fetchZone = useCallback(
    () => api.zone(id).then((d) => { if (idRef.current === id) setZ(d); }).catch(() => {}),
    [id],
  );
  const live = useLive((s) => s.live);
  usePolling(fetchZone, live ? 60_000 : 8000, open, id); // socket frames carry the hot numbers; pauses while the tab is hidden

  const liveZone = useLive((s) => s.zones.find((x) => x.id === id));
  const view = useMemo(
    () => (z && z.id === id ? (liveZone ? { ...z, ...liveZone } : z) : null),
    [z, liveZone, id],
  );

  /* ----- session form ----- */
  const [plate, setPlate] = useState("");
  const [touched, setTouched] = useState(false);
  const [mins, setMins] = useState(60);
  const [step, setStep] = useState<"form" | "review">("form");
  const [quote, setQuote] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [wait, setWait] = useState(0);
  const [edge, setEdge] = useState(false);
  const busyRef = useRef(false);
  const plateRef = useRef<HTMLInputElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setZ(null); setStep("form"); setQuote(null); setResult(null); setWait(0);
  }, [id]);

  useEffect(() => { // Retry-After countdown
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  useEffect(() => {
    if (wait === 0) setResult((r) => (r && r.kind === "err" && r.key === "rate" && r.counting ? null : r));
  }, [wait]);

  const firstStep = useRef(true);
  useEffect(() => { // keep keyboard focus on something enabled when the step changes
    if (firstStep.current) { firstStep.current = false; return; }
    (step === "form" ? plateRef : primaryRef).current?.focus({ preventScroll: true });
  }, [step]);

  const norm = normalizePlate(plate);
  const inRange = norm.length >= PLATE_MIN && norm.length <= PLATE_MAX;
  const plateErr: "required" | "length" | "chars" | null =
    !norm ? "required"
      : !PLATE_RE.test(norm) && inRange ? "chars"
        : !inRange ? "length"
          : null;
  const valid = plateErr === null;
  const showErr = plateErr !== null && (touched || plateErr === "chars" || norm.length > PLATE_MAX);

  const free = view?.free ?? 0;
  const c = view ? statusColor[view.status] : "var(--accent)";
  const cost = view ? sessionCost(view.effective_rate, mins) : 0;
  const priceChanged = step === "review" && quote !== null && quote !== cost;

  const pay = async () => {
    if (!view || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setResult(null);
    try {
      const s = await api.startSession(view.id, norm, mins);
      setResult({ kind: "ok", id: String((s as { id?: unknown }).id ?? "") });
      setPlate(""); setTouched(false); setStep("form"); setQuote(null);
      void refreshWallet();
      void fetchZone();
    } catch (e) {
      const { key, wait: w } = classify(e, free);
      setResult({ kind: "err", key, counting: w > 0 });
      setWait(w);
      if (key === "invalid") setStep("form");
      if (key === "full" || key === "tooMany") void fetchZone();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !view) return;
    if (step === "form") {
      if (!valid) { setTouched(true); plateRef.current?.focus(); return; }
      setResult(null);
      setQuote(cost);
      setStep("review");
      return;
    }
    if (priceChanged) { setQuote(cost); return; } // show the new amount before taking money
    void pay();
  };

  const errText = (r: Extract<Result, { kind: "err" }>) =>
    r.key === "rate"
      ? (r.counting && wait > 0 ? tpl(t.panel.err.rate, { n: fmt(wait, lang) }) : t.panel.err.rateNoWait)
      : t.panel.err[r.key];

  const plateErrText = plateErr ? t.panel.plateErr[plateErr] : "";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden sm:items-stretch sm:justify-end">
      <div ref={backdropRef} className="absolute inset-0 sm:backdrop-blur-sm" style={{ background: "var(--scrim)" }}
        onClick={() => select(null)} aria-hidden />

      <div ref={frameRef} className="relative flex h-[90dvh] w-full sm:h-full sm:w-[440px] sm:max-w-full">
        {/* rubber-banding past the open position would otherwise show a gap behind the sheet */}
        <div className="pointer-events-none absolute inset-x-0 top-full h-24 sm:hidden" style={{ background: "var(--surface-solid)" }} aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 start-full hidden w-24 sm:block" style={{ background: "var(--surface-solid)" }} aria-hidden />

        <aside
          ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={!view}
          tabIndex={-1} onKeyDown={trapTab}
          onScroll={(e) => { const on = e.currentTarget.scrollTop > 2; setEdge((p) => (p === on ? p : on)); }}
          className="glass relative flex h-full w-full flex-col overflow-y-auto overscroll-contain rounded-t-[28px] outline-none sm:rounded-none sm:rounded-s-[28px]">
          <div
            className="sticky top-0 z-10 cursor-grab touch-none select-none px-5 pb-4 pt-3 active:cursor-grabbing sm:pt-5"
            style={{ background: "var(--surface)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            onPointerDown={onDown} onPointerMove={onMove}
            onPointerUp={(e) => onUp(e)} onPointerCancel={(e) => onUp(e, true)}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full sm:hidden" style={{ background: "var(--border-strong)" }} aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id={titleId} className="t-title truncate text-xl font-extrabold">{view ? view.name[lang] : id}</h2>
                {view && (
                  <div className="mt-1 text-[12px] text-[var(--muted)] num">
                    {view.id} · {t.panel.district} {fmt(view.district, lang)} · {t.zones.kind[view.kind]}
                  </div>
                )}
              </div>
              <button ref={closeRef} onClick={() => select(null)} className="btn btn-ghost !p-2" aria-label={t.cta.close}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="scroll-edge-below" data-on={edge} aria-hidden />
          </div>

          {!view ? (
            <div className="grid flex-1 place-items-center p-10 text-sm text-[var(--muted)]" role="status">{t.panel.loading}</div>
          ) : (
            <div className="grid gap-4 p-5 pt-3">
              <div className="flex items-center gap-4 rounded-[20px] border p-4 hairline" style={{ background: "var(--surface)" }}>
                <Ring value={view.occupancy} color={c} label={pct(view.occupancy, lang)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[var(--muted)]">{t.panel.rateNow}</div>
                  <div className="num text-[26px] font-extrabold !leading-none" style={{ color: c }}>
                    {fmt(view.effective_rate, lang)}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">{t.panel.perHour}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] num text-[var(--muted)]">
                    <span className="chip">{fmt(view.free, lang)} {t.zones.free}</span>
                    <span className="chip">{t.panel.base} {fmt(view.base_rate, lang)}</span>
                  </div>
                </div>
              </div>

              {view.event?.active && (
                <div className="rounded-[18px] p-3 text-[12px] font-semibold"
                  style={{ background: "var(--accent-soft)", color: "var(--amber)" }}>
                  ⚡ {t.panel.eventNow} — {view.event.title[lang]} (×{view.event.multiplier})
                </div>
              )}

              <div className="rounded-[20px] border p-4 hairline">
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <span className="font-semibold">{t.panel.history}</span>
                  <span className="num text-[var(--muted)]">{pct(view.history[view.history.length - 1]?.occupancy ?? 0, lang)}</span>
                </div>
                <Spark data={view.history.map((h) => h.occupancy)} color={c} height={70} />
                <div className="mb-2 mt-4 flex items-center justify-between text-[12px]">
                  <span className="font-semibold">{t.panel.forecast}</span>
                </div>
                <Spark data={view.forecast.map((f) => f.occupancy)} color="var(--violet)" height={56} dots />
              </div>

              {view.rate_changes.length > 0 && (
                <div className="rounded-[20px] border p-4 hairline">
                  <div className="mb-2 text-[12px] font-semibold">{t.panel.changes}</div>
                  <ul className="grid gap-1.5">
                    {view.rate_changes.slice(0, 5).map((r, i) => (
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
                  [t.panel.sensors, `${fmt(view.sensors.online, lang)}/${fmt(view.sensors.total, lang)}`],
                  [t.panel.revenue, `${fmt(view.revenue_today / 1000, lang, 1)} ${t.dash.million}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[18px] border p-3 hairline">
                    <div className="text-[11px] text-[var(--muted)]">{k}</div>
                    <div className="num mt-1 text-sm font-bold">{v}</div>
                  </div>
                ))}
              </div>

              {/* session */}
              <form onSubmit={onSubmit} noValidate className="rounded-[20px] border p-4 hairline" style={{ background: "var(--surface)" }}>
                <div className="text-[13px] font-bold">{step === "form" ? t.panel.start : t.panel.reviewTitle}</div>

                {result?.kind === "ok" && (
                  <div role="status" className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.5l4.2 4.2L19 7" />
                    </svg>
                    <span>{t.panel.success}{result.id && <> · <span dir="ltr" className="num">{result.id}</span></>}</span>
                  </div>
                )}

                {step === "form" ? (
                  <>
                    <label htmlFor={plateId} className="sr-only">{t.panel.plate}</label>
                    <input
                      id={plateId} ref={plateRef} value={plate} placeholder={t.panel.plate}
                      onChange={(e) => setPlate(e.target.value)} onBlur={() => setTouched(true)}
                      aria-invalid={showErr} aria-describedby={showErr ? errId : hintId} aria-required
                      dir="auto" autoComplete="off" autoCapitalize="characters" spellCheck={false}
                      enterKeyHint="done" maxLength={PLATE_MAX * 2}
                      className="field mt-3" />
                    <p id={showErr ? errId : hintId} aria-live="polite" className="mt-1.5 min-h-4 text-[11px] leading-4"
                      style={{ color: showErr ? "var(--rose)" : "var(--muted)" }}>
                      {showErr ? plateErrText : t.panel.plateHint}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t.panel.duration}>
                      {[30, 60, 120, 180].map((m) => (
                        <button key={m} type="button" onClick={() => setMins(m)} aria-pressed={mins === m}
                          className="btn !py-1.5 !px-3 !text-[12px] num"
                          style={mins === m
                            ? { background: "var(--accent)", color: "var(--on-accent)" }
                            : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                          {fmt(m, lang)} {t.units.min}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[12px] text-[var(--muted)]">{t.panel.amount}</span>
                      <span className="num text-lg font-extrabold">{fmt(cost, lang)} <span className="text-[11px] font-normal text-[var(--muted)]">{t.units.toman}</span></span>
                    </div>
                    {/* aria-disabled, not disabled: Enter in an invalid field must still submit so the error shows */}
                    <button ref={primaryRef} type="submit" disabled={free <= 0} aria-disabled={!valid || free <= 0}
                      className="btn btn-primary mt-3 w-full disabled:opacity-50 aria-disabled:opacity-50">
                      {free <= 0 ? t.panel.full : t.panel.review}
                    </button>
                  </>
                ) : (
                  <>
                    <dl className="mt-3 grid gap-2 text-[13px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[var(--muted)]">{t.panel.zone}</dt>
                        <dd className="min-w-0 truncate font-semibold">{view.name[lang]}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[var(--muted)]">{t.panel.plate}</dt>
                        <dd dir="auto" className="num font-semibold">{norm}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[var(--muted)]">{t.panel.duration}</dt>
                        <dd className="num font-semibold">{fmt(mins, lang)} {t.units.min}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t pt-2 hairline">
                        <dt className="text-[var(--muted)]">{t.panel.amount}</dt>
                        <dd className="num text-lg font-extrabold">{fmt(cost, lang)} <span className="text-[11px] font-normal text-[var(--muted)]">{t.units.toman}</span></dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[12px] text-[var(--muted)]">{t.panel.payFrom}</p>
                    {priceChanged && (
                      <p role="alert" className="mt-2 rounded-xl px-3 py-2 text-[12px] font-medium"
                        style={{ background: "var(--accent-soft)", color: "var(--amber)" }}>{t.panel.priceChanged}</p>
                    )}
                    <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStep("form")}>{t.cta.back}</button>
                      <button ref={primaryRef} type="submit" disabled={busy || wait > 0 || free <= 0}
                        className="btn btn-primary disabled:opacity-50">
                        {busy ? t.panel.paying : free <= 0 ? t.panel.full : t.panel.confirm}
                      </button>
                    </div>
                  </>
                )}

                {result?.kind === "err" && (
                  <div role="alert" className="mt-3 rounded-xl px-3 py-2 text-[12px] font-medium"
                    style={{ background: "var(--accent-soft)", color: "var(--rose)" }}>
                    {errText(result)}
                  </div>
                )}
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
