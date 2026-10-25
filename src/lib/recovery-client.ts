import { useSessionStore } from "@/store/session-store";

export type RecoveryCondition = "improving" | "unchanged" | "worsening" | "uncertain";

export type RecoveryPhoto = {
  id: number;
  plant_name: string;
  disease_name: string;
  thumbnail_url: string;
  created_at: string;
};

export type RecoveryCheckIn = {
  id: number;
  diagnosis: RecoveryPhoto | null;
  condition: RecoveryCondition;
  affected_leaves: number | null;
  note: string;
  action_taken: string;
  created_at: string;
};

export type RecoveryCase = {
  id: number;
  title: string;
  plant_name: string;
  baseline_diagnosis: RecoveryPhoto | null;
  plot: number | null;
  plot_name: string;
  next_check_date: string;
  is_closed: boolean;
  check_in_count: number;
  check_ins?: RecoveryCheckIn[];
  created_at: string;
  updated_at: string;
};

type RecoveryPage = { count: number; results: RecoveryCase[]; next_offset: number | null };

function firstError(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstError(value[0]);
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      const message = firstError(entry);
      if (message) return message;
    }
  }
  return "Không thể lưu đợt theo dõi. Vui lòng thử lại.";
}

async function request<T>(path: string, accessToken: string | null, init?: RequestInit, retry = true): Promise<T> {
  const response = await fetch(`/api/django/api/diagnoses/recovery${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
  });
  if (response.status === 401 && retry) {
    const renewed = await useSessionStore.getState().refreshAccessToken();
    if (renewed) return request<T>(path, renewed, init, false);
  }
  if (!response.ok) throw new Error(firstError(await response.json().catch(() => null)));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function fetchRecoveryCases(token: string | null, offset = 0) {
  return request<RecoveryPage>(`?limit=50&offset=${offset}`, token);
}

export function fetchRecoveryCase(token: string | null, id: number) {
  return request<RecoveryCase>(`/${id}`, token);
}

export function createRecoveryCase(token: string | null, payload: {
  baseline_diagnosis_id: number;
  plot_id?: number | null;
  title?: string;
  next_check_date?: string;
}) {
  return request<RecoveryCase>("", token, { method: "POST", body: JSON.stringify(payload) });
}

export function updateRecoveryCase(token: string | null, id: number, payload: {
  title?: string;
  next_check_date?: string;
  is_closed?: boolean;
}) {
  return request<RecoveryCase>(`/${id}`, token, { method: "PATCH", body: JSON.stringify(payload) });
}

export function createRecoveryCheckIn(token: string | null, id: number, payload: {
  diagnosis_id: number;
  same_subject_confirmed: true;
  condition: RecoveryCondition;
  affected_leaves?: number | null;
  note?: string;
  action_taken?: string;
  next_check_date?: string;
}) {
  return request<RecoveryCheckIn>(`/${id}/check-ins`, token, { method: "POST", body: JSON.stringify(payload) });
}
