"use client";
import { useApp } from "@/lib/app";

export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="mx-auto max-w-[1180px] px-4 pb-10">
      <div className="glass card flex flex-col items-center gap-2 p-6 text-center">
        <div className="text-sm font-bold">{t.brand}</div>
        <p className="text-[12px] text-[var(--muted)]">{t.footer.made}</p>
        <p className="text-[11px] text-[var(--muted)] num">© {new Date().getFullYear()} — {t.footer.rights}</p>
      </div>
    </footer>
  );
}
