"use client";

import type { CultivationLog, FarmPlot, TraceabilityRecord } from "@/lib/farmops-client";

/**
 * Update/delete calls the farms page needs that `@/lib/farmops-client` does not
 * expose yet. They live here so the page can offer full CRUD today; move them
 * into `src/lib/farmops-client.ts` once that file gains the same helpers.
 */

/**
 * Same envelope as the client in `@/lib/farmops-client`, but it also unwraps
 * DRF field errors (`{"product_name": ["..."]}`) so a rejected submit shows the
 * real reason instead of a bare "HTTP 400".
 */
function messageFromPayload(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as Record<string, unknown>;
  const direct = payload.detail ?? payload.error;
  if (typeof direct === "string" && direct) return direct;

  for (const value of Object.values(payload)) {
    if (typeof value === "string" && value) return value;
    if (Array.isArray(value) && typeof value[0] === "string" && value[0]) return value[0];
  }
  return fallback;
}

async function farmopsFetch<T>(path: string, accessToken: string | null | undefined, init?: RequestInit): Promise<T> {
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
      message = messageFromPayload(await res.json(), message);
    } catch {
      // response had no JSON body; keep the status message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function updateFarmPlot(accessToken: string | null | undefined, id: number, payload: Record<string, unknown>) {
  return farmopsFetch<FarmPlot>(`/api/farm-plots/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateCultivationLog(
  accessToken: string | null | undefined,
  id: number,
  payload: Record<string, unknown>,
) {
  return farmopsFetch<CultivationLog>(`/api/cultivation-logs/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCultivationLog(accessToken: string | null | undefined, id: number) {
  return farmopsFetch<void>(`/api/cultivation-logs/${id}`, accessToken, { method: "DELETE" });
}

export function fetchTraceabilityRecords(accessToken: string | null | undefined) {
  return farmopsFetch<TraceabilityRecord[]>("/api/traceability", accessToken);
}

export function updateTraceability(
  accessToken: string | null | undefined,
  id: number,
  payload: Record<string, unknown>,
) {
  return farmopsFetch<TraceabilityRecord>(`/api/traceability/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTraceability(accessToken: string | null | undefined, id: number) {
  return farmopsFetch<void>(`/api/traceability/${id}`, accessToken, { method: "DELETE" });
}
