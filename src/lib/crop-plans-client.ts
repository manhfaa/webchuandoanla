import type {
  CreateCropPlanPayload,
  CropCatalogItem,
  CropLocation,
  CropPlan,
  CropPlanPreview,
  ReminderItem,
} from "@/types";

async function djangoCropFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
): Promise<T> {
  const normalizedPath = path.replace(/^\//, "").replace(/\/+$/, "");
  const res = await fetch(`/api/django/${normalizedPath}`, {
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
    try {
      const data = (await res.json()) as any;
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (typeof data?.non_field_errors?.[0] === "string") {
        message = data.non_field_errors[0];
      } else if (typeof data?.[0] === "string") {
        message = data[0];
      }
    } catch {
      // ignore parse errors
    }
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
  return djangoCropFetch<CropPlan>(
    "/api/crop-plans/plans/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export function fetchCropPlans(accessToken: string | null) {
  return djangoCropFetch<CropPlan[]>("/api/crop-plans/plans/", { method: "GET" }, accessToken);
}

export function fetchCropPlanDetail(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<CropPlan>(
    `/api/crop-plans/plans/${planId}/`,
    { method: "GET" },
    accessToken,
  );
}

export function regenerateCropPlan(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<CropPlan>(
    `/api/crop-plans/plans/${planId}/regenerate/`,
    { method: "POST", body: JSON.stringify({}) },
    accessToken,
  );
}

export function refreshCropPlanWeather(accessToken: string | null, planId: number | string) {
  return djangoCropFetch<Record<string, any>>(
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

export function fetchReminders(accessToken: string | null, filter?: string) {
  const query = filter ? `?filter=${encodeURIComponent(filter)}` : "";
  return djangoCropFetch<ReminderItem[]>(
    `/api/crop-plans/reminders/${query}`,
    { method: "GET" },
    accessToken,
  );
}

export function markReminderRead(accessToken: string | null, reminderId: number | string) {
  return djangoCropFetch<{ status: string }>(
    `/api/crop-plans/reminders/${reminderId}/read/`,
    {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    },
    accessToken,
  );
}

