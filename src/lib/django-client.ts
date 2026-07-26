import type { ActionPlan, PlanTier, UserProfile } from "@/types";
import { raiseIfPlanLimited, type LimitKey } from "@/lib/plan-limit";
import { normalizePlan } from "@/lib/plans";
import { normalizeUserDisplayName } from "@/lib/user-profile";

export type DjangoLoginResponse = {
  access: string;
  refresh: string;
};

export type DjangoRegisterRequest = {
  email: string;
  password: string;
  accepted_terms: boolean;
};

export type DjangoRegisterResponse = DjangoLoginResponse & {
  id: number;
  email: string;
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

/** The full account record served by /api/users/me/. */
export type DjangoAccount = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  company_name: string;
  farm_name: string;
  location: string;
  current_plan: PlanTier;
  plan_expires_at: string | null;
  terms_accepted_at: string | null;
  terms_version: string;
  has_usable_password: boolean;
};

export type DjangoAccountPatch = Partial<
  Pick<DjangoAccount, "full_name" | "email" | "phone" | "avatar_url" | "company_name" | "farm_name" | "location">
>;

export type DjangoUserSettings = {
  theme: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  diagnosis_auto_save: boolean;
  marketing_opt_in: boolean;
  expert_chat_enabled: boolean;
  timezone: string;
  updated_at: string;
};

export type DjangoAccountDeletionPreview = {
  diagnoses: number;
  farm_plots: number;
  cultivation_logs: number;
  traceability_records: number;
  farm_locations: number;
  crop_plans: number;
  chat_conversations: number;
  payment_orders: number;
  confirm_phrase: string;
};

export const AVATAR_PLACEHOLDER = "/avatars/user-demo.svg";

export function mapAccountToUserProfile(account: DjangoAccount): UserProfile {
  return {
    name: normalizeUserDisplayName(account.full_name),
    email: account.email,
    // Kept raw (possibly empty): the placeholder used to be stored here and
    // then echoed back into the editable field, which made every profile save
    // fail with "Nhập một URL hợp lệ." Render-time code applies the fallback.
    avatar: account.avatar_url ?? "",
    currentPlan: normalizePlan(account.current_plan),
  };
}

/**
 * Error carrying the HTTP status and DRF's per-field messages, so a caller can
 * branch on a specific field (e.g. the Google consent gate) instead of pattern
 * matching on a translated sentence.
 */
export class DjangoApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "DjangoApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = firstMessage(entry);
      if (nested) return nested;
    }
  }
  return null;
}

function readErrorBody(data: unknown, statusCode: number) {
  const fieldErrors: Record<string, string> = {};
  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const message = firstMessage(value);
      if (message) fieldErrors[key] = message;
    }
  }

  // Prefer the keys DRF uses for whole-request problems, then fall back to
  // whichever field failed — a bare "HTTP 400" told the user nothing.
  const message =
    fieldErrors.detail ??
    fieldErrors.non_field_errors ??
    fieldErrors.error ??
    Object.values(fieldErrors)[0] ??
    `HTTP ${statusCode}`;

  return { message, fieldErrors };
}

type DjangoFetchInit = RequestInit & {
  timeoutMs?: number;
  /** Which plan cap this call spends, so a 402 can name it. */
  limitKey?: LimitKey;
};

async function djangoFetch<T>(path: string, init?: DjangoFetchInit): Promise<T> {
  const normalizedPath = path.replace(/^\//, "").replace(/\/+$/, "");
  const { timeoutMs = 30000, limitKey, ...fetchInit } = init ?? {};
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
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // A proxy or gateway may answer with something that is not JSON.
    }
    // A plan cap answers 402 with limit/used/upgrade_to. Reading only `detail`
    // here would throw away everything the upgrade prompt needs to be useful.
    raiseIfPlanLimited(res.status, data, limitKey);
    const { message, fieldErrors } = readErrorBody(data, res.status);
    throw new DjangoApiError(
      res.status === 429 ? describeThrottle(message) : message,
      res.status,
      fieldErrors,
    );
  }

  // 204 No Content (account deletion) has no body to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** DRF's throttle message is raw English with a second count; make it human. */
function describeThrottle(message: string): string {
  const seconds = Number(/(\d+)\s*second/.exec(message)?.[1] ?? 0);
  if (!seconds) return "Bạn đã thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.";
  const minutes = Math.ceil(seconds / 60);
  const wait = seconds < 60 ? `${seconds} giây` : `${minutes} phút`;
  return `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau khoảng ${wait}.`;
}

/**
 * Lets the session store supply the current access token and refresh it, without
 * django-client importing the store (the store already imports this module).
 */
type AuthTokenBridge = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
};

let authTokenBridge: AuthTokenBridge | null = null;

export function registerAuthTokenBridge(bridge: AuthTokenBridge) {
  authTokenBridge = bridge;
}

/**
 * Authenticated request that survives an expired access token: the 30-minute
 * token used to be refreshed only on a full page load, so a session died
 * mid-use during client-side navigation.
 */
async function djangoAuthedFetch<T>(path: string, init?: DjangoFetchInit): Promise<T> {
  const accessToken = authTokenBridge?.getAccessToken() ?? null;
  if (!accessToken) {
    throw new DjangoApiError("Bạn cần đăng nhập lại để tiếp tục.", 401);
  }

  const withToken = (token: string): DjangoFetchInit => ({
    ...init,
    headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
  });

  try {
    return await djangoFetch<T>(path, withToken(accessToken));
  } catch (error) {
    if (!(error instanceof DjangoApiError) || error.status !== 401 || !authTokenBridge) throw error;

    const refreshed = await authTokenBridge.refreshAccessToken();
    if (!refreshed) {
      throw new DjangoApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", 401);
    }
    return djangoFetch<T>(path, withToken(refreshed));
  }
}

export async function djangoLogin(payload: { email: string; password: string }) {
  return djangoFetch<DjangoLoginResponse>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
}

export async function djangoGoogleLogin(payload: { credential: string; acceptedTerms?: boolean }) {
  return djangoFetch<DjangoLoginResponse>("/api/auth/google/", {
    method: "POST",
    body: JSON.stringify({
      credential: payload.credential,
      accepted_terms: Boolean(payload.acceptedTerms),
    }),
  });
}

/** Blacklists the refresh token so signing out is not merely local state. */
export async function djangoLogout(refreshToken: string) {
  return djangoFetch<{ detail: string }>("/api/auth/logout/", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

export async function djangoRequestPasswordReset(email: string) {
  // delivery_enabled is false when no mail provider is configured: the link
  // would only reach the server log, so the screen must say the feature is off
  // rather than tell the user to watch an inbox.
  return djangoFetch<{ detail: string; delivery_enabled?: boolean }>("/api/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function djangoConfirmPasswordReset(payload: { token: string; newPassword: string }) {
  return djangoFetch<DjangoLoginResponse & { detail: string }>("/api/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify({ token: payload.token, new_password: payload.newPassword }),
  });
}

/**
 * Exchange a refresh token for a fresh access token. Refresh rotation is on, so
 * the response may also carry a new refresh token that must replace the stored one.
 */
export async function djangoRefreshToken(refreshToken: string) {
  return djangoFetch<{ access: string; refresh?: string }>("/api/auth/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

/** Registration now returns the JWT pair, so the account and the session are
 * created in one round-trip instead of create-then-login. */
export async function djangoRegister(payload: DjangoRegisterRequest) {
  return djangoFetch<DjangoRegisterResponse>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Used right after sign-in, before the store holds a token to refresh with. */
export async function djangoMe(accessToken: string) {
  const account = await djangoFetch<DjangoAccount>("/api/users/me/", {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  return mapAccountToUserProfile(account);
}

export async function djangoAccount() {
  return djangoAuthedFetch<DjangoAccount>("/api/users/me/", { method: "GET" });
}

export async function djangoUpdateMe(payload: DjangoAccountPatch) {
  return djangoAuthedFetch<DjangoAccount>("/api/users/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function djangoChangePassword(payload: { currentPassword?: string; newPassword: string }) {
  return djangoAuthedFetch<DjangoLoginResponse & { detail: string }>("/api/users/change-password/", {
    method: "POST",
    body: JSON.stringify({
      current_password: payload.currentPassword ?? "",
      new_password: payload.newPassword,
    }),
  });
}

export async function djangoAccountDeletionPreview() {
  return djangoAuthedFetch<DjangoAccountDeletionPreview>("/api/users/me/deletion-preview/", {
    method: "GET",
  });
}

export async function djangoDeleteAccount(payload: { password?: string; confirmText: string }) {
  return djangoAuthedFetch<void>("/api/users/me/", {
    method: "DELETE",
    body: JSON.stringify({ password: payload.password ?? "", confirm_text: payload.confirmText }),
  });
}

export async function djangoUserSettings() {
  return djangoAuthedFetch<DjangoUserSettings>("/api/users/settings/", { method: "GET" });
}

export async function djangoUpdateUserSettings(payload: Partial<Omit<DjangoUserSettings, "updated_at">>) {
  return djangoAuthedFetch<DjangoUserSettings>("/api/users/settings/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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
    limitKey: "daily_diagnoses",
  });
}
