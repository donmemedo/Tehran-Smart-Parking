"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app";
import { fmt } from "@/lib/i18n";

function Mark() {
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[13px] overflow-hidden sheen"
      style={{ background: "linear-gradient(140deg, var(--accent), var(--violet))" }}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#04140f" strokeWidth="2.4" strokeLinecap="round">
        <path d="M9 18V7.5a1 1 0 0 1 1-1h3.2a3.4 3.4 0 0 1 0 6.8H9" />
      </svg>
    </span>
  );
}

export default function Header({ page = "home" }: { page?: "home" | "dashboard" }) {
  const { t, lang, setLang, theme, toggleTheme, live, wallet } = useApp();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    h(); window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const links =
    page === "home"
      ? [["#map", t.nav.map], ["#zones", t.nav.zones], ["#pricing", t.nav.pricing], ["#api", t.nav.api]]
      : [];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
      <div className="mx-auto max-w-[1180px] px-4">
        <div className={`glass card flex items-center gap-3 px-3 py-2 transition-all duration-300 ${scrolled ? "shadow-lg" : ""}`}>
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Mark />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight">{t.brand}</span>
              <span className="hidden sm:block truncate text-[11px] text-[var(--muted)] leading-tight">{t.brandSub}</span>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 lg:flex">
            {links.map(([href, label]) => (
              <a key={href} href={href}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]">
                {label}
              </a>
            ))}
            <Link href={page === "dashboard" ? "/" : "/dashboard"}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]">
              {page === "dashboard" ? t.nav.map : t.nav.dashboard}
            </Link>
          </nav>

          <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
            <span className="chip hidden md:inline-flex num" title="wallet">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h2" />
              </svg>
              {fmt(wallet, lang)}
            </span>

            <button onClick={() => setLang(lang === "fa" ? "en" : "fa")}
              className="btn btn-ghost !px-3 !py-1.5 !text-[12px]" aria-label="language">
              {lang === "fa" ? "EN" : "فا"}
            </button>

            <button onClick={toggleTheme} className="btn btn-ghost !px-2.5 !py-1.5" aria-label={theme === "dark" ? t.theme.light : t.theme.dark}>
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                </svg>
              )}
            </button>

            <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost !px-2.5 !py-1.5 lg:hidden" aria-label="menu">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="glass card mt-2 grid gap-1 p-2 lg:hidden grow-in">
            {links.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium hover:bg-[var(--accent-soft)]">{label}</a>
            ))}
            <Link href={page === "dashboard" ? "/" : "/dashboard"} onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-medium hover:bg-[var(--accent-soft)]">
              {page === "dashboard" ? t.nav.map : t.nav.dashboard}
            </Link>
            <div className="px-4 py-2 text-xs text-[var(--muted)] num">
              {live ? t.map.live : t.map.offline} · {fmt(wallet, lang)} {t.units.toman}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
