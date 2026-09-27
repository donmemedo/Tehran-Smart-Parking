export const API =
  (typeof window !== "undefined" && (window as any).__API__) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8090";

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

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export const api = {
  zones: () => get<{ items: Zone[] }>("/api/zones"),
  zone: (id: string) => get<ZoneDetail>(`/api/zones/${id}`),
  overview: () => get<Overview>("/api/stats/overview"),
  events: () => get<{ items: CityEvent[] }>("/api/events"),
  wallet: () => get<{ balance: number; currency: string }>("/api/wallet"),
  startSession: async (zone_id: string, plate: string, minutes: number) => {
    const r = await fetch(`${API}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone_id, plate, minutes }),
    });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  },
};

export const statusColor: Record<Zone["status"], string> = {
  open: "var(--accent)",
  moderate: "var(--violet)",
  busy: "var(--amber)",
  full: "var(--rose)",
};
