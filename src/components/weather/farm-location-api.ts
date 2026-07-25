import type { FarmLocation } from "@/lib/farmops-client";

/** One message per offending field, keyed exactly as DRF returned it. */
export type FieldErrors = Record<string, string>;

/** Error carrying the DRF field map so a form can highlight the failing input. */
export type LocationApiError = Error & { status: number; fieldErrors: FieldErrors };

export type FarmLocationPayload = {
  name?: string;
  province?: string;
  district?: string;
  ward?: string;
  address_text?: string;
  crop_type?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
};

const ENDPOINT = "/api/django/api/farm-locations";

/** Form-wide keys DRF uses; everything else names a field of the form. */
const FORM_LEVEL_KEYS = ["detail", "error", "non_field_errors"];

function flatten(data: Record<string, unknown>): FieldErrors {
  const flattened: FieldErrors = {};
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") flattened[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flattened[key] = value[0];
  });
  return flattened;
}

async function toApiError(response: Response): Promise<LocationApiError> {
  let messages: FieldErrors = {};
  try {
    const data: unknown = await response.json();
    if (data && typeof data === "object") messages = flatten(data as Record<string, unknown>);
  } catch {
    // Not a JSON body (gateway/HTML error page) — the status message has to do.
  }

  const fieldErrors: FieldErrors = { ...messages };
  FORM_LEVEL_KEYS.forEach((key) => delete fieldErrors[key]);

  const message =
    messages.detail ||
    messages.error ||
    messages.non_field_errors ||
    Object.values(fieldErrors)[0] ||
    `HTTP ${response.status}`;

  const apiError = new Error(message) as LocationApiError;
  apiError.status = response.status;
  apiError.fieldErrors = fieldErrors;
  return apiError;
}

async function request<T>(path: string, accessToken: string | null | undefined, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function createFarmLocation(accessToken: string | null | undefined, payload: FarmLocationPayload) {
  return request<FarmLocation>(ENDPOINT, accessToken, { method: "POST", body: JSON.stringify(payload) });
}

/**
 * Partial update. The serializer re-geocodes whenever the request carries no
 * coordinates, which silently moves the pin to the centre of Vietnam, so a
 * caller that only wants to rename must still send the saved coordinates (or,
 * failing that, the full address) — see `locationPatchBase` on the page.
 */
export function updateFarmLocation(
  accessToken: string | null | undefined,
  id: number,
  payload: FarmLocationPayload,
) {
  return request<FarmLocation>(`${ENDPOINT}/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFarmLocation(accessToken: string | null | undefined, id: number) {
  return request<void>(`${ENDPOINT}/${id}`, accessToken, { method: "DELETE" });
}

export function getFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {};
  const { fieldErrors } = error as { fieldErrors?: FieldErrors };
  return fieldErrors ?? {};
}
