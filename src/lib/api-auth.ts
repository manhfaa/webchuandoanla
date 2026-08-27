import { resolveDjangoBaseUrl } from "@/lib/backend-url";

const DJANGO_BASE_URL = resolveDjangoBaseUrl(process.env.DJANGO_BASE_URL);

function djangoUrl(path: string) {
  const base = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
  return new URL(path, base);
}

/** Feature flags Django resolves from the plan the user actually holds. */
type PlanFeatures = {
  yolo?: boolean;
  cnn?: boolean;
  rag?: boolean;
  expert_chat?: boolean;
  reports?: boolean;
};

export type FeatureGateResult =
  | { allowed: true }
  | { allowed: false; status: number; body: Record<string, unknown> };

/**
 * Refuse a paid AI route when the caller's plan does not include the feature.
 *
 * These routes run outside Django, so nothing else stops a Seed account from
 * spending DeepSeek and Tavily credit on a capability its plan does not sell.
 * The plan is read from Django rather than from anything the browser sends, and
 * the refusal body matches what src/lib/plan-limit.ts already parses so the
 * upgrade dialog appears exactly as it does for a backend 402.
 *
 * Fails CLOSED: if entitlements cannot be read, the spend does not happen.
 */
export async function requirePlanFeature(
  request: Request,
  feature: keyof PlanFeatures,
  /** `en` is optional so a route that has not been given one still compiles. */
  message: { vi: string; en?: string; upgradeTo: string },
): Promise<FeatureGateResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return {
      allowed: false,
      status: 401,
      body: {
        error: "Bạn cần đăng nhập để dùng tính năng này.",
        error_en: "Sign in to use this feature.",
      },
    };
  }

  let payload: { entitlements?: { plan?: string; features?: PlanFeatures } } | null = null;
  try {
    const res = await fetch(djangoUrl("api/payments/subscription/"), {
      method: "GET",
      headers: { authorization },
      cache: "no-store",
    });
    if (res.status === 401) {
      return {
        allowed: false,
        status: 401,
        body: {
          error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          error_en: "Your session has expired. Please sign in again.",
        },
      };
    }
    if (res.ok) payload = await res.json();
  } catch {
    payload = null;
  }

  if (!payload?.entitlements?.features) {
    return {
      allowed: false,
      status: 503,
      body: {
        error: "Chưa kiểm tra được quyền sử dụng của gói dịch vụ. Vui lòng thử lại sau.",
        error_en: "We could not check what your plan includes. Please try again shortly.",
      },
    };
  }

  if (payload.entitlements.features[feature]) return { allowed: true };

  return {
    allowed: false,
    status: 402,
    body: {
      detail: message.vi,
      error: message.vi,
      // The same keys src/lib/plan-limit.ts reads for the English twin, so the
      // upgrade dialog follows the language switch instead of staying in
      // Vietnamese. Empty when the calling route has not supplied one.
      detail_en: message.en ?? "",
      error_en: message.en ?? "",
      code: "plan_limit_exceeded",
      plan: payload.entitlements.plan ?? "seed",
      upgrade_to: message.upgradeTo,
    },
  };
}
