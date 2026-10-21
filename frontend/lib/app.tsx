"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
  type ReactNode,
} from "react";
import { api, statusColor, wsUrl, type CityEvent, type Overview, type Zone } from "./api";
import { dict, type Dict, type Lang } from "./i18n";

/* ──────────────────────────────────────────────────────────────────────────
   Two separate channels, so a 5-second socket frame never re-renders the shell:

   1. PrefsContext  – language / theme. Changes only when the user flips a switch.
   2. Live store    – zones, overview, events, socket state, wallet, selected zone.
                      Lives outside React and is read with useSyncExternalStore through
                      selector hooks (useLive(s => s.zones)), so a component re-renders only
                      when the slice it selected changes.
   ────────────────────────────────────────────────────────────────────────── */

/* ---------- preferences ---------- */

type Theme = "light" | "dark";

export type Prefs = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  dir: "rtl" | "ltr";
  theme: Theme;
  toggleTheme: () => void;
};

const PrefsCtx = createContext<Prefs | null>(null);

export function usePrefs(): Prefs {
  const p = useContext(PrefsCtx);
  if (!p) throw new Error("usePrefs must be used inside <Providers>");
  return p;
}

/** @deprecated Preferences only (lang, t, dir, theme). Live data moved to useLive(selector). */
export const useApp = usePrefs;

/* ---------- live store ---------- */

export type LiveState = {
  zones: Zone[];
  overview: Overview | null;
  events: CityEvent[];
  /** true while the websocket is connected */
  live: boolean;
  /** true once zones have arrived (first /api/zones response or socket frame) */
  loaded: boolean;
  wallet: number;
  /** zone id whose sheet is open */
  selected: string | null;
};

export type LiveActions = {
  /** Open (id) or close (null) the zone sheet. Pass the clicked element so focus can return to it. */
  select: (id: string | null, opener?: Element | null) => void;
  refreshWallet: () => Promise<void>;
  refreshOverview: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  /** element that had focus when the sheet was opened (for focus return) */
  getOpener: () => Element | null;
};

const INITIAL: LiveState = { zones: [], overview: null, events: [], live: false, loaded: false, wallet: 0, selected: null };

type Store = {
  get: () => LiveState;
  set: (patch: Partial<LiveState>) => void;
  subscribe: (l: () => void) => () => void;
  actions: LiveActions;
};

/* A zone object is reused when nothing in it changed, so memoised cards skip the render and an
   unchanged frame leaves the zones array (and every subscriber) untouched. */
function sameZone(a: Zone, b: Zone): boolean {
  const ka = Object.keys(a) as (keyof Zone)[];
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    const x: unknown = a[k];
    const y: unknown = b[k];
    if (x === y) continue;
    if (typeof x !== "object" || x === null || typeof y !== "object" || y === null) return false;
    if (JSON.stringify(x) !== JSON.stringify(y)) return false;
  }
  return true;
}

function mergeZones(prev: Zone[], next: Zone[]): Zone[] {
  const byId = new Map(prev.map((z) => [z.id, z] as const));
  let same = prev.length === next.length;
  const out = next.map((z, i) => {
    const p = byId.get(z.id);
    const r = p && sameZone(p, z) ? p : z;
    if (r !== prev[i]) same = false;
    return r;
  });
  return same ? prev : out;
}

/* Frames carry only zones, so the headline numbers that are plain sums over zones are kept in
   step locally (same arithmetic as the server). Revenue, sensor health and the daily curve are
   refreshed from /api/stats/overview on connect, on tab return and on the dashboard. */
function patchOverview(o: Overview | null, zones: Zone[]): Overview | null {
  if (!o || zones.length === 0) return o;
  let capacity = 0;
  let occupied = 0;
  for (const z of zones) { capacity += z.capacity; occupied += z.occupied; }
  if (capacity <= 0) return o;
  const free = capacity - occupied;
  const occupancy = Math.round((occupied / capacity) * 1000) / 1000;
  if (o.capacity === capacity && o.occupied === occupied && o.free === free
      && o.occupancy === occupancy && o.zones === zones.length) return o;
  return { ...o, capacity, occupied, free, occupancy, zones: zones.length };
}

function createStore(): Store {
  let state = INITIAL;
  let opener: Element | null = null;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<LiveState>) => {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof LiveState)[]) {
      if (!Object.is(state[k], patch[k])) { changed = true; break; }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  const actions: LiveActions = {
    select(id, from) {
      if (id) opener = from ?? (typeof document !== "undefined" ? document.activeElement : null);
      set({ selected: id });
    },
    refreshWallet: () =>
      api.wallet().then((w) => set({ wallet: w.balance })).catch(() => {}),
    refreshOverview: () =>
      api.overview().then((o) => set({ overview: patchOverview(o, state.zones) })).catch(() => {}),
    refreshEvents: () =>
      api.events().then((e) => set({ events: e.items })).catch(() => {}),
    getOpener: () => opener,
  };

  return {
    get: () => state,
    set,
    subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    actions,
  };
}

const StoreCtx = createContext<Store | null>(null);

function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("live hooks must be used inside <Providers>");
  return s;
}

/**
 * Subscribe to a slice of the live store. The selector must return a value that is referentially
 * stable while the underlying data is unchanged (pick a field or find an existing element; do not
 * build a new array/object inside it, derive that with useMemo instead).
 */
export function useLive<T>(selector: (s: LiveState) => T): T {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(INITIAL),
  );
}

export const useSelected = () => useLive((s) => s.selected);

/** Stable action functions; reading them never causes a re-render. */
export function useLiveActions(): LiveActions {
  return useStore().actions;
}

/* ---------- socket + polling lifecycle ---------- */

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const OVERVIEW_POLL_MS = 15_000;
const MAX_FRAME_CHARS = 2_000_000;
const MAX_ZONES = 500;
/* The server pushes a frame every 5 s and the client never sends, so silence is the only sign of a
   half-open connection. */
const WATCHDOG_MS = 5_000;
const STALE_MS = 15_000;

/* Every field the UI dereferences, so one malformed zone can not throw during render. */
const NUM_FIELDS = ["district", "capacity", "occupied", "free", "occupancy", "rate", "effective_rate", "base_rate", "x", "y"] as const;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isText = (v: unknown) => isObj(v) && typeof v.fa === "string" && typeof v.en === "string";

function isZone(z: unknown): z is Zone {
  if (!isObj(z)) return false;
  const e = z.event;
  return typeof z.id === "string" && isText(z.name)
    && NUM_FIELDS.every((k) => isNum(z[k]))
    && typeof z.status === "string" && Object.hasOwn(statusColor, z.status)
    && (z.kind === "street" || z.kind === "garage")
    && (e == null || (isObj(e) && isText(e.title) && isNum(e.multiplier)));
}

/** Keep the valid zones of a server list (capped). Null when it is not a list, or when nothing in a
    non-empty list is usable (so garbage can not blank the map). */
function cleanZones(raw: unknown): Zone[] | null {
  if (!Array.isArray(raw)) return null;
  const zones = raw.slice(0, MAX_ZONES).filter(isZone);
  return zones.length > 0 || raw.length === 0 ? zones : null;
}

/** The socket is push-only; validate the frame shape before trusting it. */
function parseFrame(data: unknown): Zone[] | null {
  if (typeof data !== "string" || data.length > MAX_FRAME_CHARS) return null;
  try {
    const d: unknown = JSON.parse(data);
    return isObj(d) ? cleanZones(d.zones) : null;
  } catch {
    return null;
  }
}

function startLive(store: Store): () => void {
  let stopped = false;
  let socket: WebSocket | null = null;
  let retries = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let lastFrame = Date.now(); // last time the open socket proved it was alive
  let pending: Zone[] | null = null; // newest frame received while the tab was hidden

  const applyZones = (zones: Zone[]) => {
    const s = store.get();
    const merged = mergeZones(s.zones, zones);
    store.set(merged === s.zones
      ? { loaded: true }
      : { zones: merged, overview: patchOverview(s.overview, merged), loaded: true });
  };

  const loadZones = () =>
    api.zones()
      .then((z) => { const zs = cleanZones(z.items); if (zs && !stopped) applyZones(zs); })
      .catch(() => {});

  /* Zones first: the overview is patched with sums over the zones, so stale zones would overwrite
     fresh figures. */
  const refresh = () => loadZones().then(() => store.actions.refreshOverview());

  const loadAll = () => {
    void refresh();
    void store.actions.refreshEvents();
    void store.actions.refreshWallet();
  };

  /* While the socket is down (and the tab visible) poll zones + overview. While it is up, frames
     keep the zones current and the dashboard / pricing sections poll the rest themselves. */
  const syncPoll = () => {
    const want = !document.hidden && !store.get().live;
    if (want && pollTimer === undefined) {
      pollTimer = setInterval(() => { void refresh(); }, OVERVIEW_POLL_MS);
    } else if (!want && pollTimer !== undefined) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer !== undefined) return;
    const cap = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** retries);
    const delay = cap / 2 + Math.random() * (cap / 2); // jitter: 50-100% of the cap
    retries = Math.min(retries + 1, 10);
    reconnectTimer = setTimeout(() => { reconnectTimer = undefined; connect(); }, delay);
  };

  const handleClosed = (ws: WebSocket) => {
    if (socket !== ws) return;
    socket = null;
    store.set({ live: false });
    scheduleReconnect();
  };

  /* No frame for STALE_MS: treat the socket as dead and reconnect with backoff. The handlers stay
     attached; handleClosed is idempotent, and calling it directly means a half-open socket whose
     close handshake never completes can not delay the reconnect. */
  const checkStale = () => {
    const ws = socket;
    if (!ws || Date.now() - lastFrame < STALE_MS) return;
    try { ws.close(); } catch { /* already closed */ }
    handleClosed(ws);
  };

  function connect() {
    if (stopped) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      scheduleReconnect();
      return;
    }
    socket = ws;
    lastFrame = Date.now(); // a socket that is still connecting gets the full STALE_MS
    // The socket is server-push only: nothing is ever sent from the client.
    ws.onopen = () => {
      if (socket !== ws) return;
      lastFrame = Date.now();
      store.set({ live: true });
      void store.actions.refreshOverview();
    };
    ws.onmessage = (ev) => {
      if (socket !== ws) return;
      const zones = parseFrame(ev.data);
      if (!zones) return;
      lastFrame = Date.now();
      retries = 0;
      if (document.hidden) pending = zones;
      else applyZones(zones);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* already closed */ } };
    ws.onclose = () => handleClosed(ws);
  }

  const onVisibility = () => {
    syncPoll();
    if (document.hidden) return;
    checkStale();
    if (pending) { applyZones(pending); pending = null; }
    void refresh();
    void store.actions.refreshEvents();
  };

  const onOnline = () => {
    if (stopped || socket) return;
    if (reconnectTimer !== undefined) { clearTimeout(reconnectTimer); reconnectTimer = undefined; }
    retries = 0;
    connect();
  };

  // Deferred a tick so React StrictMode's mount/unmount/mount never opens a throwaway socket.
  const boot = setTimeout(() => {
    loadAll(); connect(); syncPoll();
    watchdog = setInterval(checkStale, WATCHDOG_MS);
  }, 0);
  const unsubscribe = store.subscribe(syncPoll);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onOnline);

  return () => {
    stopped = true;
    clearTimeout(boot);
    if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
    if (pollTimer !== undefined) clearInterval(pollTimer);
    if (watchdog !== undefined) clearInterval(watchdog);
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("online", onOnline);
    if (socket) {
      const s = socket;
      socket = null;
      s.onopen = s.onmessage = s.onerror = s.onclose = null;
      try { s.close(); } catch { /* already closed */ }
    }
    store.set({ live: false });
  };
}

/* ---------- providers ---------- */

export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);
  const [lang, setLang] = useState<Lang>("fa");
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  /* Restore preferences after hydration. Until then nothing writes to the DOM or storage, so the
     values the inline no-flash script already applied are never briefly overwritten. */
  useEffect(() => {
    try {
      const sl = localStorage.getItem("ph:lang");
      if (sl === "fa" || sl === "en") setLang(sl);
      const st = localStorage.getItem("ph:theme");
      if (st === "light" || st === "dark") setTheme(st);
      else setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    } catch {
      /* storage blocked: keep defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dict[lang].dir;
    try { localStorage.setItem("ph:lang", lang); } catch { /* ignore */ }
  }, [lang, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("ph:theme", theme); } catch { /* ignore */ }
  }, [theme, ready]);

  useEffect(() => startLive(store), [store]);

  /* Service worker (production only; the inline registration script was removed from the layout). */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); };
    if (document.readyState === "complete") { register(); return; }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  const toggleTheme = useCallback(() => setTheme((p) => (p === "dark" ? "light" : "dark")), []);

  const prefs = useMemo<Prefs>(
    () => ({ lang, setLang, t: dict[lang], dir: dict[lang].dir, theme, toggleTheme }),
    [lang, theme, toggleTheme],
  );

  return (
    <StoreCtx.Provider value={store}>
      <PrefsCtx.Provider value={prefs}>{children}</PrefsCtx.Provider>
    </StoreCtx.Provider>
  );
}

/* ---------- hooks ---------- */

/**
 * Run `fn` every `ms` while `enabled` and the tab is visible. Pauses while document.hidden and
 * fires once immediately on becoming visible again. `key` restarts the poll (e.g. a new zone id).
 */
export function usePolling(fn: () => unknown, ms: number, enabled = true, key: unknown = null) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const run = () => {
      try { Promise.resolve(ref.current()).catch(() => {}); } catch { /* caller's problem */ }
    };
    const sync = () => {
      if (document.hidden) {
        if (timer !== undefined) { clearInterval(timer); timer = undefined; }
      } else if (timer === undefined) {
        run();
        timer = setInterval(run, ms);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      if (timer !== undefined) clearInterval(timer);
    };
  }, [ms, enabled, key]);
}

/**
 * Reveal-on-scroll. One IntersectionObserver for the whole page, each element is unobserved the
 * moment it reveals, and .reveal elements mounted later are picked up by a MutationObserver.
 */
export function useReveal() {
  useEffect(() => {
    const all = () => document.querySelectorAll<HTMLElement>(".reveal:not(.in)");
    if (typeof IntersectionObserver === "undefined") {
      all().forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12 },
    );
    const watch = (root: ParentNode) => {
      if (root instanceof Element && root.matches(".reveal:not(.in)")) io.observe(root);
      root.querySelectorAll?.(".reveal:not(.in)").forEach((el) => io.observe(el));
    };
    all().forEach((el) => io.observe(el));
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => { if (n instanceof Element) watch(n); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

/** Lets server components (the pages) opt into reveal-on-scroll without becoming client components. */
export function RevealObserver() {
  useReveal();
  return null;
}
