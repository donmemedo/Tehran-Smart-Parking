"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { API, Zone, Overview, CityEvent, api } from "./api";
import { dict, Lang, Dict } from "./i18n";

type Ctx = {
  lang: Lang; setLang: (l: Lang) => void; t: Dict; dir: "rtl" | "ltr";
  theme: "light" | "dark"; toggleTheme: () => void;
  zones: Zone[]; overview: Overview | null; events: CityEvent[];
  live: boolean; wallet: number; refreshWallet: () => void;
  selected: string | null; select: (id: string | null) => void;
};

const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fa");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [zones, setZones] = useState<Zone[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [live, setLive] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [selected, select] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  /* restore preferences */
  useEffect(() => {
    try {
      const l = (localStorage.getItem("ph:lang") as Lang) || "fa";
      const th = (localStorage.getItem("ph:theme") as "light" | "dark") ||
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      setLangState(l); setTheme(th);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dict[lang].dir;
    try { localStorage.setItem("ph:lang", lang); } catch {}
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("ph:theme", theme); } catch {}
  }, [theme]);

  /* initial load + websocket live feed */
  const load = useCallback(async () => {
    try {
      const [z, o, e, w] = await Promise.all([api.zones(), api.overview(), api.events(), api.wallet()]);
      setZones(z.items); setOverview(o); setEvents(e.items); setWallet(w.balance);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(() => { api.overview().then(setOverview).catch(() => {}); }, 15000);
    let closed = false;
    const connect = () => {
      try {
        const url = API.replace(/^http/, "ws") + "/ws/live";
        const socket = new WebSocket(url);
        ws.current = socket;
        socket.onopen = () => setLive(true);
        socket.onmessage = (ev) => {
          const d = JSON.parse(ev.data);
          if (d.zones) setZones(d.zones);
        };
        socket.onclose = () => { setLive(false); if (!closed) setTimeout(connect, 4000); };
        socket.onerror = () => socket.close();
      } catch { setLive(false); }
    };
    connect();
    return () => { closed = true; clearInterval(poll); ws.current?.close(); };
  }, [load]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: setLangState,
    t: dict[lang] as unknown as Dict,
    dir: dict[lang].dir as "rtl" | "ltr",
    theme,
    toggleTheme: () => setTheme((p) => (p === "dark" ? "light" : "dark")),
    zones, overview, events, live, wallet,
    refreshWallet: () => api.wallet().then((w) => setWallet(w.balance)).catch(() => {}),
    selected, select,
  }), [lang, theme, zones, overview, events, live, wallet, selected]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

/* reveal-on-scroll helper */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}
