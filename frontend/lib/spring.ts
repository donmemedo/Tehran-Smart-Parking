/* Tiny damped-spring animator using Apple's parameters (dampingRatio, response in s, mass 1).
   Unit-agnostic: `rest` is the settle threshold in whatever unit x is in. */

export type SpringParams = { dampingRatio: number; response: number };

export function animateSpring(o: SpringParams & {
  from: number; to: number; velocity?: number; rest?: number;
  onUpdate: (x: number, v: number) => void;
  onRest?: () => void;
}): () => void {
  const k = (2 * Math.PI / o.response) ** 2;
  const c = (4 * Math.PI * o.dampingRatio) / o.response;
  const rest = o.rest ?? 0.001;
  let x = o.from, v = o.velocity ?? 0, last = 0, raf = 0;
  const step = (now: number) => {
    const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60;
    last = now;
    const n = Math.ceil(dt / 0.004), h = dt / n; // sub-steps keep semi-implicit Euler stable
    for (let i = 0; i < n; i++) { v += (-k * (x - o.to) - c * v) * h; x += v * h; }
    const done = Math.abs(x - o.to) < rest && Math.abs(v) < rest * 10;
    if (done) { x = o.to; v = 0; } else raf = requestAnimationFrame(step);
    o.onUpdate(x, v); // runs after scheduling, so calling the returned cancel here works
    if (done) o.onRest?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** Where a flick would come to rest (UIScrollView normal deceleration), v in units/s. */
export const project = (v: number, rate = 0.998) => ((v / 1000) * rate) / (1 - rate);

/** Rubber-band resistance past an edge: x = overdrag, d = dimension. */
export const rubberband = (x: number, d: number, c = 0.55) => (x * d * c) / (d + c * Math.abs(x));
