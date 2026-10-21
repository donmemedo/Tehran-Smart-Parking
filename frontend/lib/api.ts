/**
 * API client. The browser only ever talks to its own origin: next.config.mjs rewrites
 * /api/* and /ws/* to the backend, so there is no cross-origin traffic, no CORS surface
 * and no runtime-overridable base URL.
 */
export const API = "";

/** Live-feed socket URL. Server-push only: the client never sends frames. */
export function wsUrl(): string {
  const fixed = process.env.NEXT_PUBLIC_WS_URL;
  if (fixed && /^wss?:\/\//i.test(fixed)) return fixed;
  if (typeof location === "undefined") return "";
  return `${location.protocol === "https:" ? "wss://" : "ws://"}${location.host}/ws/live`;
}

/** Thrown for any non-2xx response. `message` is the status code as a string. */
export class ApiError extends Error {
  status: number;
  retryAfter?: number;
  /** Server `detail` when it is a plain string, e.g. "zone is full" or "too many active sessions". */
  detail?: string;
  constructor(status: number, opts: { retryAfter?: number; detail?: string } = {}) {
    super(String(status));
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = opts.retryAfter;
    this.detail = opts.detail;
  }
}

/* ---------- shared validation rules (the server enforces the same ones) ---------- */

/** Latin or Persian letters and digits, space, hyphen and ZWNJ. Length is checked separately. */
export const PLATE_RE = /^[0-9A-Za-z\u0600-\u06FF\u200c -]+$/;
export const PLATE_MIN = 2;
export const PLATE_MAX = 16;

/** Trim and collapse runs of whitespace, exactly as the server does before validating. */
export function normalizePlate(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function isValidPlate(s: string): boolean {
  const n = normalizePlate(s);
  return n.length >= PLATE_MIN && n.length <= PLATE_MAX && PLATE_RE.test(n);
}

/** cost = floor(effective_rate * minutes / 60), identical to the server's rule. */
export function sessionCost(rate: number, minutes: number): number {
  const c = Math.floor((rate * minutes) / 60);
  return Number.isFinite(c) && c > 0 ? c : 0;
}

export type Zone = {
  id: string;
  name: { fa: string; en: string };
  district: number;
  kind: "street" | "garage";
  capacity: number;
  occupied: number;
  free: number;
  occupancy: number;
  status: "open" | "moderate" | "busy" | "full";
  rate: number;
  effective_rate: number;
  base_rate: number;
  x: number;
  y: number;
  sensor_health: number;
  event?: CityEvent | null;
};

export type CityEvent = {
  id: string;
  zone_id: string;
  title: { fa: string; en: string };
  start: string;
  end: string;
  multiplier: number;
  active: boolean;
  starts_in_min?: number;
};

export type ZoneDetail = Zone & {
  history: { hour: number; occupancy: number; rate: number; revenue: number }[];
  forecast: { hour: number; occupancy: number }[];
  rate_changes: { t: string; from: number; to: number; occupancy: number; reason: string }[];
  revenue_today: number;
  sensors: { total: number; online: number };
};

export type Overview = {
  capacity: number; occupied: number; free: number; occupancy: number; zones: number;
  avg_rate: number; revenue_today: number; sensor_health: number;
  sensors: { total: number; online: number };
  search_time_saved_min: number; co2_saved_kg: number;
  curve: { hour: number; occupancy: number }[];
  active_events: CityEvent[];
  updated_at: string;
};

export type Session = {
  id: string;
  zone_id: string;
  zone_name: { fa: string; en: string };
  plate: string;
  minutes: number;
  rate: number;
  cost: number;
  start: string;
  end: string;
  status: string;
  /** Present on the response to POST /api/sessions/{id}/stop. */
  refund?: number;
};

export type Wallet = { balance: number; currency: string };

/* ---------- transport ---------- */

async function toError(r: Response): Promise<ApiError> {
  const raw = r.headers.get("Retry-After");
  const ra = raw === null || raw.trim() === "" ? NaN : Number(raw);
  const retryAfter = Number.isFinite(ra) && ra >= 0 ? Math.ceil(ra) : undefined;
  let detail: string | undefined;
  try {
    const j = await r.json();
    if (j && typeof j.detail === "string") detail = j.detail;
  } catch {}
  return new ApiError(r.status, { retryAfter, detail });
}

async function parse<T>(r: Response): Promise<T> {
  if (!r.ok) throw await toError(r);
  return r.json();
}

async function get<T>(path: string): Promise<T> {
  return parse<T>(await fetch(`${API}${path}`, { cache: "no-store" }));
}

/* ---------- anonymous device identity ---------- */

const TOKEN_KEY = "ph:token";
let memToken: string | null = null; // fallback when localStorage is unavailable
let identifying: Promise<string> | null = null;

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || memToken;
  } catch {
    return memToken;
  }
}

function storeToken(t: string) {
  memToken = t;
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
}

/** Forget `used` only if it is still the current token, so a slow 401 can not wipe a fresh one. */
function dropToken(used: string) {
  if (readToken() !== used) return;
  memToken = null;
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

function identify(): Promise<string> {
  // Concurrent callers share one in-flight request, so one tab gets one account.
  identifying ??= (async () => {
    const create = async () => {
      const r = await fetch(`${API}/api/identity`, { method: "POST", cache: "no-store" });
      if (!r.ok) throw await toError(r);
      const j = await r.json();
      if (!j || typeof j.token !== "string" || !j.token) throw new ApiError(502);
      storeToken(j.token);
      return j.token as string;
    };
    // Across tabs, take a lock and re-read the token inside it, so two tabs share one account.
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    return locks ? locks.request("ph:identify", async () => readToken() ?? create()) : create();
  })().finally(() => { identifying = null; });
  return identifying;
}

async function getToken(): Promise<string> {
  return readToken() ?? identify();
}

/** Authenticated request. On 401: drop the token, identify again, retry exactly once. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const r = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
    if (r.status === 401 && attempt === 0) {
      dropToken(token);
      continue;
    }
    return parse<T>(r);
  }
}

const enc = encodeURIComponent;

export const api = {
  zones: () => get<{ items: Zone[] }>("/api/zones"),
  zone: (id: string) => get<ZoneDetail>(`/api/zones/${enc(id)}`),
  overview: () => get<Overview>("/api/stats/overview"),
  events: () => get<{ items: CityEvent[] }>("/api/events"),
  wallet: () => authed<Wallet>("/api/wallet"),
  sessions: () => authed<{ items: Session[] }>("/api/sessions"),
  startSession: (zone_id: string, plate: string, minutes: number) =>
    authed<Session>("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone_id, plate: normalizePlate(plate), minutes }),
    }),
  stopSession: (id: string) => authed<Session>(`/api/sessions/${enc(id)}/stop`, { method: "POST" }),
};

export const statusColor: Record<Zone["status"], string> = {
  open: "var(--accent)",
  moderate: "var(--violet)",
  busy: "var(--amber)",
  full: "var(--rose)",
};
