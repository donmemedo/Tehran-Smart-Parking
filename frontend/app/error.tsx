"use client";
import { usePrefs } from "@/lib/app";

/* Route-level error boundary: a render error shows this instead of a white screen. It renders
   inside the root layout, so Providers (and therefore usePrefs) is always mounted here. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = usePrefs();
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-[480px] place-items-center px-4">
      <div role="alert" className="glass card w-full p-8 text-center">
        <h1 className="t-title text-xl font-extrabold">{t.error.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{t.error.body}</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-6">{t.error.retry}</button>
      </div>
    </main>
  );
}
