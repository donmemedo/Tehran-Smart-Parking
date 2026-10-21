"use client";
import { usePrefs } from "@/lib/app";

export default function Footer() {
  const { t, lang } = usePrefs();
  // Jalali year for Persian readers, Gregorian for English. Computed on the client's clock, so the
  // text node opts out of the hydration check.
  const year = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", { year: "numeric" }).format(new Date());
  return (
    <footer className="mx-auto max-w-[1180px] px-4 pb-10">
      <div className="glass card flex flex-col items-center gap-2 p-6 text-center">
        <div className="text-sm font-bold">{t.brand}</div>
        <p className="text-[12px] text-[var(--muted)]">{t.footer.made}</p>
        <p className="text-[11px] text-[var(--muted)] num">
          © <span suppressHydrationWarning>{year}</span> — {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
