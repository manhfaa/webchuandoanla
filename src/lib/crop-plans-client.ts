import { raiseIfPlanLimited, type LimitKey } from "@/lib/plan-limit";
import type {
  CreateCropPlanPayload,
  CropCatalogItem,
  CropLocation,
  CropPlan,
  CropPlanPreview,
  CropPlanStatus,
  CropPlanStepStatus,
  ReminderItem,
} from "@/types";

/** How much of a plan's climate assessment rests on measured observations. */
export type ClimateConfidence = "observed" | "climatology" | "unavailable" | "";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CropPlanStepSummary {
  id: number;
  step_number: number;
  title: string;
  title_en?: string;
  short_label: string;
  short_label_en?: string;
  status: CropPlanStepStatus;
}

/** Plan list rows: no steps, no reminders, no weather series. */
export interface CropPlanListItem {
  id: number;
  crop: CropCatalogItem;
  location: CropLocation;
  title: string;
  title_en?: string;
  planting_mode: string;
  plant_count: number;
  planned_start_date: string;
  recommended_start_date: string | null;
  status: CropPlanStatus;
  suitability_score: number | null;
  suitability_level: string;
  summary: string;
  summary_en?: string;
  plan_version: number;
  current_step: CropPlanStepSummary | null;
  step_count: number;
  completed_step_count: number;
  reminder_count: number | null;
  climate_confidence: ClimateConfidence;
  weather_source: string;
  created_at: string;
  updated_at: string;
}

export type CropPlanDetail = Omit<CropPlan, "reminders" | "suitability_score"> & {
  suitability_score: number | null;
  climate_confidence: ClimateConfidence;
  reminder_count: number;
};

export interface WeatherRefreshResult {
  warnings: string[];
  warnings_en: string[];
  derived_metrics: Record<string, number | string | null>;
  confidence: ClimateConfidence;
  source: string;
  coverage: Record<string, number>;
  refreshed_at: string;
  status: CropPlanStatus;
}

export type ReminderFilter = "today" | "missed" | "upcoming" | "unread";

/**
 * DRF reports field problems as `{"plant_count": ["..."]}`, which matches none
 * of the well-known keys, so those used to surface as the literal "HTTP 400".
 */
function extractErrorMessage(data: unknown): string {
  if (typeof data === "string") {
    return data.trim();
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const message = extractErrorMessage(item);
      if (message) return message;
    }
    return "";
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["detail", "error", "non_field_errors"]) {
      const message = extractErrorMessage(record[key]);
      if (message) return message;
    }
    for (const value of Object.values(record)) {
      const message = extractErrorMessage(value);
      if (message) return message;
    }
  }
  return "";
}

async function djangoCropFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
  /** Which plan cap this call spends, so a 402 can name it. */
  limitKey?: LimitKey,
): Promise<T> {
  const [rawPath, query] = path.split("?");
  const normalizedPath = rawPath.replace(/^\//, "").replace(/\/+$/, "");
  const res = await fetch(`/api/django/${normalizedPath}${query ? `?${query}` : ""}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // ignore parse errors
    }
    // A plan cap answers 402 with limit/used/upgrade_to; keep it structured so
    // the upgrade prompt can say which plan lifts it.
    raiseIfPlanLimited(res.status, data, limitKey);
    message = extractErrorMessage(data) || message;
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function fetchCropCatalog(accessToken: string | null) {
  return djangoCropFetch<CropCatalogItem[]>("/api/crop-plans/crops/", { method: "GET" }, accessToken);
}

export function fetchCropLocations(accessToken: string | null) {
  return djangoCropFetch<CropLocation[]>("/api/crop-plans/locations/", { method: "GET" }, accessToken);
}

export function createCropLocation(
  accessToken: string | null,
  payload: Partial<CropLocation> & { name: string; lat: number; lon: number },
) {
  return djangoCropFetch<CropLocation>(
    "/api/crop-plans/locations/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export function updateCropLocation(
  accessToken: string | null,
  locationId: number,
  payload: Partial<Pick<CropLocation, "name" | "lat" | "lon" | "address_text" | "is_default">>,
) {
  return djangoCropFetch<CropLocation>(
    `/api/crop-plans/locations/${locationId}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    accessToken,
  );
}

export function deleteCropLocation(accessToken: string | null, locationId: number) {
  return djangoCropFetch<void>(
    `/api/crop-plans/locations/${locationId}/`,
    { method: "DELETE" },
    accessToken,
  );
}

export function previewCropPlan(accessToken: string | null, payload: CreateCropPlanPayload) {
  return djangoCropFetch<CropPlanPreview>(
    "/api/crop-plans/plans/preview/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export function createCropPlan(accessToken: string | null, payload: CreateCropPlanPayload) {
  return djangoCropFetch<CropPlanDetail>(
    "/api/crop-plans/plans/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
    "crop_plans",
  );
}

export function fetchCropPlans(
  accessToken: string | null,
  options: { page?: number; pageSize?: number; includeArchived?: boolean } = {},
) {
  const query = new URLSearchParams();
  if (options.page) query.set("page", String(options.page));
  if (options.pageSize) query.set("page_size", String(options.pageSize));
  if (options.includeArchived) query.set("include_archived", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return djangoCropFetch<Paginated<CropPlanListItem>>(
    `/api/crop-plans/plans/${suffix}`,
    { method: "GET" },
    accessToken,
  );
}

export function fetchCropPlanDetail(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<CropPlanDetail>(
    `/api/crop-plans/plans/${planId}/`,
    { method: "GET" },
    accessToken,
  );
}

export function updateCropPlan(
  accessToken: string | null,
  planId: number | string,
  payload: { title?: string; status?: CropPlanStatus },
) {
  return djangoCropFetch<CropPlanDetail>(
    `/api/crop-plans/plans/${planId}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    accessToken,
  );
}

export function deleteCropPlan(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<void>(
    `/api/crop-plans/plans/${planId}/`,
    { method: "DELETE" },
    accessToken,
  );
}

/** Rebuilds the schedule on the same plan id; progress is reset. */
export function regenerateCropPlan(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<CropPlanDetail>(
    `/api/crop-plans/plans/${planId}/regenerate/`,
    { method: "POST", body: JSON.stringify({}) },
    accessToken,
  );
}

export function refreshCropPlanWeather(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<WeatherRefreshResult>(
    `/api/crop-plans/plans/${planId}/weather-refresh/`,
    { method: "POST", body: JSON.stringify({}) },
    accessToken,
  );
}

export function completeCropPlanStep(
  accessToken: string | null,
  stepId: number | string,
  note = "",
) {
  return djangoCropFetch<{ status: string }>(
    `/api/crop-plans/steps/${stepId}/complete/`,
    {
      method: "POST",
      body: JSON.stringify({ note }),
    },
    accessToken,
  );
}

export function reopenCropPlanStep(accessToken: string | null, stepId: number | string) {
  return djangoCropFetch<{ status: string }>(
    `/api/crop-plans/steps/${stepId}/reopen/`,
    { method: "POST", body: JSON.stringify({}) },
    accessToken,
  );
}

export function delayCropPlanStep(
  accessToken: string | null,
  stepId: number | string,
  delayDays: number,
  reason = "",
) {
  return djangoCropFetch<{ status: string }>(
    `/api/crop-plans/steps/${stepId}/delay/`,
    {
      method: "POST",
      body: JSON.stringify({ delay_days: delayDays, reason }),
    },
    accessToken,
  );
}

export function saveCropPlanStepNote(
  accessToken: string | null,
  stepId: number | string,
  note: string,
) {
  return djangoCropFetch<{ status: string }>(
    `/api/crop-plans/steps/${stepId}/notes/`,
    {
      method: "POST",
      body: JSON.stringify({ note }),
    },
    accessToken,
  );
}

export function fetchReminders(
  accessToken: string | null,
  options: { filter?: ReminderFilter; planId?: number | string; page?: number; pageSize?: number } = {},
) {
  const query = new URLSearchParams();
  if (options.filter) query.set("filter", options.filter);
  if (options.planId) query.set("plan", String(options.planId));
  if (options.page) query.set("page", String(options.page));
  if (options.pageSize) query.set("page_size", String(options.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return djangoCropFetch<Paginated<ReminderItem>>(
    `/api/crop-plans/reminders/${suffix}`,
    { method: "GET" },
    accessToken,
  );
}

export function markReminderRead(
  accessToken: string | null,
  reminderId: number | string,
  read = true,
) {
  return djangoCropFetch<{ status: string }>(
    `/api/crop-plans/reminders/${reminderId}/read/`,
    {
      method: "PATCH",
      body: JSON.stringify({ read }),
    },
    accessToken,
  );
}
