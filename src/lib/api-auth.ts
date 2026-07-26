const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

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
  message: { vi: string; upgradeTo: string },
): Promise<FeatureGateResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return { allowed: false, status: 401, body: { error: "Bạn cần đăng nhập để dùng tính năng này." } };
  }

  let payload: { entitlements?: { plan?: string; features?: PlanFeatures } } | null = null;
  try {
    const res = await fetch(djangoUrl("api/payments/subscription/"), {
      method: "GET",
      headers: { authorization },
      cache: "no-store",
    });
    if (res.status === 401) {
      return { allowed: false, status: 401, body: { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." } };
    }
    if (res.ok) payload = await res.json();
  } catch {
    payload = null;
  }

  if (!payload?.entitlements?.features) {
    return {
      allowed: false,
      status: 503,
      body: { error: "Chưa kiểm tra được quyền sử dụng của gói dịch vụ. Vui lòng thử lại sau." },
    };
  }

  if (payload.entitlements.features[feature]) return { allowed: true };

  return {
    allowed: false,
    status: 402,
    body: {
      detail: message.vi,
      error: message.vi,
      code: "plan_limit_exceeded",
      plan: payload.entitlements.plan ?? "seed",
      upgrade_to: message.upgradeTo,
    },
  };
}
