export type FarmLocation = {
  id: number;
  name: string;
  province: string;
  district: string;
  ward: string;
  address_text: string;
  latitude?: number | null;
  longitude?: number | null;
  crop_type: string;
  is_default: boolean;
  metadata?: Record<string, unknown>;
};

export type FarmPlot = {
  id: number;
  name: string;
  crop_type: string;
  area_value?: string | null;
  area_unit: string;
  address_text: string;
  planting_start_date?: string | null;
  growth_stage: string;
  note: string;
  logs?: CultivationLog[];
};

export type CultivationLog = {
  id: number;
  plot: number;
  diagnosis?: number | null;
  activity_type: string;
  activity_date: string;
  title: string;
  description: string;
  image_url?: string;
  cost_amount?: string | null;
  materials: unknown[];
};

export type TraceabilityRecord = {
  id: number;
  plot: number;
  plot_name: string;
  crop_type: string;
  public_token: string;
  product_name: string;
  public_url: string;
  qr_image_url: string;
  is_public: boolean;
};

export type PublicTraceability = {
  product_name: string;
  plot_name: string;
  crop_type: string;
  region: string;
  planting_start_date?: string | null;
  growth_stage: string;
  created_at: string;
  logs: CultivationLog[];
  public_settings: Record<string, unknown>;
  disclaimer: string;
};

export type FarmAdvisory = {
  weather: {
    source: string;
    is_mock: boolean;
    latitude?: number | null;
    longitude?: number | null;
    location_name?: string;
    crop?: string;
    message: string;
    current: WeatherDay;
    forecast_3d: WeatherDay[];
    forecast_7d: WeatherDay[];
    warnings: string[];
  };
  pest_alerts: {
    risk_level: string;
    alerts: Array<{ title: string; description: string; severity: string }>;
  };
  recommendations: string[];
  disclaimer: string;
};

export type WeatherDay = {
  date: string;
  temperature_c: number;
  humidity_percent: number;
  rain_probability_percent: number;
  wind_kmh: number;
  summary: string;
};

export type AgriculturalInput = {
  id: number;
  category: "pesticide" | "fertilizer" | "nutrition" | string;
  name: string;
  group: string;
  active_ingredient: string;
  usage: string;
  suitable_crops: string[];
  related_diseases: string[];
  safety_notes: string[];
  withholding_period_days?: number | null;
  warning: string;
};

export type NutritionSymptom = {
  id: number;
  nutrient: string;
  symptom: string;
  affected_crops: string[];
  recommendation: string;
  safety_notes: string[];
};

async function apiFetch<T>(path: string, accessToken?: string | null, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const res = await fetch(`/api/django/${path.replace(/^\//, "").replace(/\/+$/, "")}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message =
        data.detail ||
        data.error ||
        data.non_field_errors?.[0] ||
        data.latitude?.[0] ||
        data.longitude?.[0] ||
        message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function fetchFarmLocations(accessToken?: string | null) {
  return apiFetch<FarmLocation[]>("/api/farm-locations", accessToken);
}

export function createFarmLocation(accessToken: string | null | undefined, payload: Partial<FarmLocation>) {
  return apiFetch<FarmLocation>("/api/farm-locations", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchFarmAdvisory(accessToken: string | null | undefined, locationId: number, crop: string) {
  return apiFetch<FarmAdvisory>(`/api/farm-advisory?location_id=${locationId}&crop=${encodeURIComponent(crop)}`, accessToken);
}

export function fetchFarmPlots(accessToken?: string | null) {
  return apiFetch<FarmPlot[]>("/api/farm-plots", accessToken);
}

export function createFarmPlot(accessToken: string | null | undefined, payload: Record<string, unknown>) {
  return apiFetch<FarmPlot>("/api/farm-plots", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteFarmPlot(accessToken: string | null | undefined, id: number) {
  return apiFetch(`/api/farm-plots/${id}`, accessToken, { method: "DELETE" });
}

export function createCultivationLog(accessToken: string | null | undefined, payload: Record<string, unknown>) {
  return apiFetch<CultivationLog>("/api/cultivation-logs", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createTraceability(accessToken: string | null | undefined, payload: Record<string, unknown>) {
  return apiFetch<TraceabilityRecord>("/api/traceability", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchInputLibrary(params: { q?: string; category?: string; crop?: string; disease?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiFetch<AgriculturalInput[]>(`/api/input-library?${query.toString()}`);
}

export function fetchNutritionSymptoms(q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch<NutritionSymptom[]>(`/api/nutrition-symptoms${query}`);
}

export function fetchPublicTraceability(token: string) {
  return apiFetch<PublicTraceability>(`/api/traceability/public/${token}`);
}
