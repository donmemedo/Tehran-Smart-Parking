"use client";
import { useId } from "react";

/** Smooth area sparkline used for occupancy / rate curves. */
export function Spark({
  data, color = "var(--accent)", height = 64, fill = true, dots = false,
}: { data: number[]; color?: string; height?: number; fill?: boolean; dots?: boolean }) {
  const id = useId();
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data, 0);
  const W = 100, H = 36;
  const pts = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * W,
    H - ((v - min) / Math.max(0.0001, max - min)) * (H - 4) - 2,
  ]);
  const d = pts
    .map(([x, y], i) => {
      if (!i) return `M${x},${y}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `C${cx},${py} ${cx},${y} ${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#g${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {dots &&
        pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.9" fill={color} />)}
    </svg>
  );
}

/** Vertical bars, e.g. average occupancy per hour. */
export function Bars({
  data, labels, color = "var(--violet)", height = 140, highlight,
}: { data: number[]; labels?: string[]; color?: string; height?: number; highlight?: number }) {
  const max = Math.max(...data, 0.001);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="group relative flex-1 flex flex-col justify-end h-full">
          <div
            className="h-full origin-bottom rounded-t-[4px] transition-[transform,opacity] duration-700"
            style={{
              transform: `scaleY(${Math.min(1, Math.max(0, v / max))})`,
              background: i === highlight ? "var(--accent)" : color,
              opacity: i === highlight ? 1 : 0.42 + (v / max) * 0.5,
            }}
          />
          {labels && i % 3 === 0 && (
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] num text-[var(--muted)]">
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Progress ring for occupancy / health. */
export function Ring({
  value, size = 92, stroke = 8, color = "var(--accent)", label,
}: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <span className="text-base font-bold num">{label}</span>
      </div>
    </div>
  );
}
