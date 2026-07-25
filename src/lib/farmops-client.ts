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

/** Units the backend accepts for `FarmPlot.area_unit`; anything else is a 400. */
export const FARM_PLOT_AREA_UNITS = ["m2", "ha", "sào", "công"] as const;

export type FarmPlotAreaUnit = (typeof FARM_PLOT_AREA_UNITS)[number];

export type FarmPlot = {
  id: number;
  /** Farm location this plot sits on; drives its weather and pest alerts. */
  location?: number | null;
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

/** What the grower publishes on the QR page. Every flag defaults to true. */
export type TraceabilityDisplaySettings = {
  show_logs: boolean;
  show_region: boolean;
  show_planting_date: boolean;
  show_growth_stage: boolean;
};

export type TraceabilityRecord = {
  id: number;
  plot: number;
  plot_name: string;
  crop_type: string;
  public_token: string;
  product_name: string;
  public_settings: Partial<TraceabilityDisplaySettings>;
  public_url: string;
  qr_image_url: string;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
};

/**
 * Care-timeline row as served to anonymous visitors: cost, materials and the
 * grower's private metadata are deliberately not part of the public payload.
 */
export type PublicTraceabilityLog = {
  id: number;
  activity_type: string;
  activity_date: string;
  title: string;
  description: string;
  image_url?: string;
};

export type PublicTraceability = {
  product_name: string;
  plot_name: string;
  crop_type: string;
  region: string;
  planting_start_date?: string | null;
  growth_stage: string;
  created_at: string;
  logs: PublicTraceabilityLog[];
  public_settings: TraceabilityDisplaySettings;
  disclaimer: string;
};

export type FarmAdvisory = {
  weather: {
    source: string;
    latitude?: number | null;
    longitude?: number | null;
    location_name?: string;
    crop?: string;
    /** Server time the forecast was pulled from Open-Meteo, ISO 8601. */
    fetched_at?: string | null;
    /** Local time of the current reading itself, ISO 8601. */
    observed_at?: string | null;
    /** IANA zone the forecast dates and `observed_at` are expressed in. */
    timezone?: string | null;
    message: string;
    /** English variant of `message`; absent on older responses. */
    message_en?: string | null;
    /** Conditions right now — not a daily aggregate. */
    current: WeatherDay;
    /** Today's aggregate: max/min temperature and the day's maximum wind. */
    today?: WeatherDay;
    forecast_3d: WeatherDay[];
    forecast_7d: WeatherDay[];
    warnings: string[];
    /** English variant of `warnings`, same order; absent on older responses. */
    warnings_en?: string[] | null;
  };
  pest_alerts: {
    risk_level: string;
    alerts: Array<{
      title: string;
      /** English variant of `title`; absent on older responses. */
      title_en?: string | null;
      description: string;
      /** English variant of `description`; absent on older responses. */
      description_en?: string | null;
      severity: string;
    }>;
  };
  recommendations: string[];
  /** English variant of `recommendations`, same order; absent on older responses. */
  recommendations_en?: string[] | null;
  disclaimer: string;
  /** English variant of `disclaimer`; absent on older responses. */
  disclaimer_en?: string | null;
};

export type WeatherDay = {
  date: string;
  temperature_c: number;
  /** Daily rows only: the day's high and low. */
  temperature_max_c?: number;
  temperature_min_c?: number;
  humidity_percent: number;
  rain_probability_percent: number;
  wind_kmh: number;
  /** Current row only: local time of the reading, ISO 8601. */
  observed_at?: string | null;
  /** False when Open-Meteo returned no live reading and today's aggregate stood in. */
  is_current?: boolean;
  /** Current row only: rain measured in the last interval. */
  precipitation_mm?: number;
  summary: string;
  /** English variant of `summary`; absent on older responses. */
  summary_en?: string | null;
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
  name_en?: string | null;
  group_en?: string | null;
  active_ingredient_en?: string | null;
  usage_en?: string | null;
  suitable_crops_en?: string[] | null;
  related_diseases_en?: string[] | null;
  safety_notes_en?: string[] | null;
  warning_en?: string | null;
};

export type NutritionSymptom = {
  id: number;
  nutrient: string;
  symptom: string;
  affected_crops: string[];
  recommendation: string;
  safety_notes: string[];
  nutrient_en?: string | null;
  symptom_en?: string | null;
  affected_crops_en?: string[] | null;
  recommendation_en?: string | null;
  safety_notes_en?: string[] | null;
};

/**
 * DRF reports field errors as `{ field: ["message"] }`, which used to surface as
 * a bare "HTTP 400". Fall back to the first message we can find so the grower
 * sees the real reason (already Vietnamese, straight from the serializer).
 */
function unwrapApiError(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;
  if (!data || typeof data !== "object") return fallback;

  const body = data as Record<string, unknown>;
  for (const key of ["detail", "error", "non_field_errors"]) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  for (const value of Object.values(body)) {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

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
      message = unwrapApiError(await res.json(), message);
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

export function updateFarmLocation(
  accessToken: string | null | undefined,
  id: number,
  payload: Partial<FarmLocation>,
) {
  return apiFetch<FarmLocation>(`/api/farm-locations/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFarmLocation(accessToken: string | null | undefined, id: number) {
  return apiFetch(`/api/farm-locations/${id}`, accessToken, { method: "DELETE" });
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

export function updateFarmPlot(
  accessToken: string | null | undefined,
  id: number,
  payload: Record<string, unknown>,
) {
  return apiFetch<FarmPlot>(`/api/farm-plots/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFarmPlot(accessToken: string | null | undefined, id: number) {
  return apiFetch(`/api/farm-plots/${id}`, accessToken, { method: "DELETE" });
}

export function fetchCultivationLogs(
  accessToken: string | null | undefined,
  params: { plotId?: number; activityType?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.plotId != null) query.set("plot_id", String(params.plotId));
  if (params.activityType) query.set("activity_type", params.activityType);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<CultivationLog[]>(`/api/cultivation-logs${suffix}`, accessToken);
}

export function createCultivationLog(accessToken: string | null | undefined, payload: Record<string, unknown>) {
  return apiFetch<CultivationLog>("/api/cultivation-logs", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCultivationLog(
  accessToken: string | null | undefined,
  id: number,
  payload: Record<string, unknown>,
) {
  return apiFetch<CultivationLog>(`/api/cultivation-logs/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCultivationLog(accessToken: string | null | undefined, id: number) {
  return apiFetch(`/api/cultivation-logs/${id}`, accessToken, { method: "DELETE" });
}

export function fetchTraceabilityRecords(accessToken?: string | null) {
  return apiFetch<TraceabilityRecord[]>("/api/traceability", accessToken);
}

export function createTraceability(accessToken: string | null | undefined, payload: Record<string, unknown>) {
  return apiFetch<TraceabilityRecord>("/api/traceability", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTraceability(
  accessToken: string | null | undefined,
  id: number,
  payload: Record<string, unknown>,
) {
  return apiFetch<TraceabilityRecord>(`/api/traceability/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTraceability(accessToken: string | null | undefined, id: number) {
  return apiFetch(`/api/traceability/${id}`, accessToken, { method: "DELETE" });
}

export function fetchInputLibrary(params: { q?: string; category?: string; crop?: string; disease?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiFetch<AgriculturalInput[]>(`/api/input-library?${query.toString()}`);
}

/**
 * Accepts either the free-text term or the individual filters, so `crop` and
 * `disease` no longer have to be collapsed into `q` to reach the backend.
 */
export function fetchNutritionSymptoms(params: string | { q?: string; crop?: string; disease?: string } = "") {
  const filters = typeof params === "string" ? { q: params } : params;
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<NutritionSymptom[]>(`/api/nutrition-symptoms${suffix}`);
}

export function fetchPublicTraceability(token: string) {
  return apiFetch<PublicTraceability>(`/api/traceability/public/${token}`);
}
