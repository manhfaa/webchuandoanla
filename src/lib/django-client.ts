import type { ActionPlan, PlanTier, UserProfile } from "@/types";
import { normalizePlan } from "@/lib/plans";

export type DjangoLoginResponse = {
  access: string;
  refresh: string;
};

export type DjangoRegisterRequest = {
  email: string;
  password: string;
};

export type DjangoCnnPrediction = {
  class_name: string;
  plant_name: string;
  disease_name: string;
  plant_name_en?: string;
  disease_name_en?: string;
  confidence: number;
};

export type DjangoCnnResponse = DjangoCnnPrediction & {
  top_predictions: DjangoCnnPrediction[];
  model_version: string;
  model_accuracy?: number;
  image_size: number;
  action_plan?: ActionPlan;
  yolo_payload?: {
    is_leaf?: boolean;
    confidence?: number;
    reason?: string;
    bbox_xyxy?: number[];
    crop_box_xyxy?: number[];
    cropped_width?: number;
    cropped_height?: number;
    detections?: Array<Record<string, unknown>>;
  };
};

type DjangoMeResponse = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  current_plan: PlanTier;
};

function mapMeToUserProfile(me: DjangoMeResponse): UserProfile {
  return {
    name: me.full_name?.trim() || "Người dùng Agromind AI",
    email: me.email,
    avatar: me.avatar_url || "/avatars/user-demo.svg",
    currentPlan: normalizePlan(me.current_plan),
  };
}

type DjangoFetchInit = RequestInit & {
  timeoutMs?: number;
};

async function djangoFetch<T>(path: string, init?: DjangoFetchInit): Promise<T> {
  const normalizedPath = path.replace(/^\//, "").replace(/\/+$/, "");
  const { timeoutMs = 30000, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`/api/django/${normalizedPath}`, {
      ...fetchInit,
      headers: {
        "content-type": "application/json",
        ...(fetchInit.headers ?? {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Kết nối máy chủ quá lâu. Vui lòng thử lại sau ít phút.");
    }
    throw new Error("Không thể kết nối máy chủ. Vui lòng thử lại sau ít phút.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as any;
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (typeof data?.non_field_errors?.[0] === "string") {
        message = data.non_field_errors[0];
      } else if (typeof data?.email?.[0] === "string") {
        message = data.email[0];
      } else if (typeof data?.password?.[0] === "string") {
        message = data.password[0];
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function djangoLogin(payload: { email: string; password: string }) {
  return djangoFetch<DjangoLoginResponse>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
}

export async function djangoGoogleLogin(payload: { credential: string }) {
  return djangoFetch<DjangoLoginResponse>("/api/auth/google/", {
    method: "POST",
    body: JSON.stringify({ credential: payload.credential }),
  });
}

export async function djangoRegister(payload: DjangoRegisterRequest) {
  return djangoFetch<{ id: number; email: string }>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function djangoMe(accessToken: string) {
  const me = await djangoFetch<DjangoMeResponse>("/api/users/me/", {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  return mapMeToUserProfile(me);
}

export async function djangoUpdateMe(
  accessToken: string,
  payload: { full_name?: string; email?: string; avatar_url?: string },
) {
  const me = await djangoFetch<DjangoMeResponse>("/api/users/me/", {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return mapMeToUserProfile(me);
}

export async function djangoClassifyLeafImage(payload: { imageDataUrl: string; accessToken?: string | null }) {
  const headers: Record<string, string> = {};
  if (payload.accessToken) {
    headers.authorization = `Bearer ${payload.accessToken}`;
  }

  return djangoFetch<DjangoCnnResponse>("/api/diagnoses/cnn/", {
    method: "POST",
    headers,
    body: JSON.stringify({
      image_data_url: payload.imageDataUrl,
      top_k: 5,
    }),
    timeoutMs: 120000,
  });
}
