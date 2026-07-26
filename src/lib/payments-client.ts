import { catalogueFeatureLines, planNamed } from "@/lib/plan-catalogue";
import { raiseIfPlanLimited, type LimitKey } from "@/lib/plan-limit";
import type { PlanTier, PricingPlan } from "@/types";

/** A plan row from the backend catalogue (`GET /api/engagement/plans/`). */
export type ServicePlanDto = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_monthly: string;
  currency: string;
  yolo_enabled: boolean;
  cnn_enabled: boolean;
  rag_enabled: boolean;
  expert_chat_enabled: boolean;
  max_diagnoses_per_month: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
};

export type PaymentOrderStatus =
  | "pending"
  | "underpaid"
  | "paid"
  | "overpaid"
  | "expired"
  | "cancelled"
  | "review";

export type PaymentOrderRecord = {
  id: string;
  payment_code: string;
  plan: string;
  plan_name: string;
  amount_expected: number;
  amount_received: number;
  remaining_amount: number;
  currency: string;
  status: PaymentOrderStatus;
  needs_reconciliation: boolean;
  reconciliation: { requested_at: string | null; resolved_at: string | null; action: string | null } | null;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanEntitlements = {
  plan: string;
  plan_name: string;
  price_monthly: number;
  currency: string;
  /** `null` means the plan has no cap for that limit. */
  limits: {
    daily_diagnoses: number | null;
    monthly_diagnoses: number | null;
    history_days: number | null;
    daily_chat_messages: number | null;
    crop_plans: number | null;
  };
  features: { yolo: boolean; cnn: boolean; rag: boolean; expert_chat: boolean; reports: boolean };
};

export type SubscriptionSummary = {
  current_plan: string;
  plan_expires_at: string | null;
  days_remaining: number | null;
  entitlements: PlanEntitlements;
  /**
   * How much of each cap is already spent. Optional: the endpoint does not
   * report it yet, and the quota hints degrade to showing the cap alone rather
   * than inventing a count the server never confirmed.
   */
  usage?: Partial<Record<LimitKey, number>>;
  subscription: {
    id: number;
    plan: string;
    plan_name: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
    auto_renew: boolean;
    payment_provider: string;
  } | null;
};

/**
 * Payment errors carry the backend's own Vietnamese explanation whenever there
 * is one ("Gói Elite vẫn còn hiệu lực…"), which is far more useful than a
 * generic client-side message. `serverMessage` tells the caller whether it may
 * show `message` as-is or should fall back to its own bilingual copy.
 */
export class PaymentsApiError extends Error {
  status: number;
  serverMessage: string;

  constructor(status: number, serverMessage: string) {
    super(serverMessage || `HTTP ${status}`);
    this.name = "PaymentsApiError";
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

function readServerMessage(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";
  const body = data as Record<string, unknown>;
  for (const key of ["detail", "error", "message"]) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  const nonField = body.non_field_errors;
  if (Array.isArray(nonField) && typeof nonField[0] === "string") return nonField[0];
  // DRF field errors ({"plan": ["..."]}) otherwise disappear into "HTTP 400".
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return "";
}

async function apiFetch<T>(path: string, accessToken?: string | null, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const response = await fetch(`/api/django/${path.replace(/^\//, "").replace(/\/+$/, "")}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    // A plan cap answers 402 with limit/used/upgrade_to; letting that collapse
    // into a plain message would drop everything the upgrade prompt needs.
    raiseIfPlanLimited(response.status, data);
    throw new PaymentsApiError(response.status, readServerMessage(data));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** The catalogue is public, so the pricing page can render it before sign-in. */
export function fetchServicePlans() {
  return apiFetch<ServicePlanDto[]>("/api/engagement/plans", null);
}

export function fetchSubscriptionSummary(accessToken?: string | null) {
  return apiFetch<SubscriptionSummary>("/api/payments/subscription", accessToken);
}

export function fetchPaymentOrders(accessToken?: string | null) {
  return apiFetch<PaymentOrderRecord[]>("/api/payments/orders", accessToken);
}

export type BankDetails = { name: string; code: string; account_number: string; account_name: string };

export type CreatedOrder = {
  created: boolean;
  needs_reconciliation: boolean;
  reconciliation: PaymentOrderRecord["reconciliation"];
  order: {
    id: string;
    plan: string;
    price: number;
    amount_received: number;
    remaining_amount: number;
    status: PaymentOrderStatus;
    transfer_content: string;
    expires_at: string;
  };
  bank: BankDetails;
  qr_url: string;
};

export type PaymentOrderDetail = {
  order: PaymentOrderRecord;
  current_plan: string;
  plan_expires_at: string | null;
  bank: BankDetails;
  qr_url: string;
};

export function createPaymentOrder(accessToken: string | null | undefined, plan: string) {
  return apiFetch<CreatedOrder>("/api/payments/orders", accessToken, {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export function fetchPaymentOrder(accessToken: string | null | undefined, orderId: string) {
  return apiFetch<PaymentOrderDetail>(`/api/payments/orders/${orderId}`, accessToken);
}

export function requestOrderReconciliation(
  accessToken: string | null | undefined,
  orderId: string,
  note?: string,
) {
  return apiFetch<{ order: PaymentOrderRecord; message: string }>(
    `/api/payments/orders/${orderId}/reconcile`,
    accessToken,
    { method: "POST", body: JSON.stringify(note ? { note } : {}) },
  );
}

const VI_NUMBER = new Intl.NumberFormat("vi-VN");
const EN_NUMBER = new Intl.NumberFormat("en-US");

export function formatVnd(amount: number, language: "vi" | "en" = "vi") {
  return `${(language === "en" ? EN_NUMBER : VI_NUMBER).format(Math.round(amount))}đ`;
}

export function planAmount(catalogue: ServicePlanDto[] | null, slug: string): number | null {
  const entry = catalogue?.find((plan) => plan.slug === slug);
  if (!entry) return null;
  const amount = Number(entry.price_monthly);
  return Number.isFinite(amount) ? Math.round(amount) : null;
}

/**
 * The checked-in catalogue in `src/data/mock/plans.ts` only survives as an
 * offline fallback: whenever the API answers, its prices win and any plan the
 * backend has retired disappears from the page. `payments/tests.py` asserts the
 * two price lists are identical, so a one-sided edit fails CI rather than
 * quietly charging a different amount than the card advertises.
 *
 * The quota bullets are generated the same way. They used to be typed out on
 * the card ("5 lần/ngày"), which is the same number `entitlements.py` enforces —
 * two copies that drift the first time a cap changes. The card now carries only
 * the copy that has no number in it and the caps arrive from the catalogue.
 */
export function applyCatalogue(
  plans: PricingPlan[],
  catalogue: ServicePlanDto[] | null,
): PricingPlan[] {
  if (!catalogue?.length) return plans;
  return plans
    // The endpoint only lists plans that are on sale, so a plan missing from
    // the answer has been retired and must stop being advertised.
    .filter((plan) => catalogue.some((item) => item.slug === plan.id && item.is_active))
    .map((plan) => {
      const entry = planNamed(catalogue, plan.id);
      const amount = planAmount(catalogue, plan.id);
      const lines = entry
        ? catalogueFeatureLines(
            entry,
            plan.features.map((feature, index) => ({ vi: feature, en: plan.featuresEn?.[index] ?? feature })),
          )
        : null;
      return {
        ...plan,
        ...(amount !== null && amount > 0
          ? { price: `${formatVnd(amount, "vi")}/tháng`, priceEn: `${formatVnd(amount, "en")}/month` }
          : {}),
        ...(lines ? { features: lines.map((line) => line.vi), featuresEn: lines.map((line) => line.en) } : {}),
      };
    });
}

const PLAN_RANK: Record<PlanTier, number> = { seed: 0, grow: 1, bloom: 2, elite: 3 };

export function planRank(slug: string): number {
  return PLAN_RANK[slug as PlanTier] ?? 0;
}

/** Orders the user can still act on from the checkout screen. */
export function isOpenOrder(order: PaymentOrderRecord) {
  return order.status === "pending" || order.status === "underpaid";
}

/**
 * Orders the backend hands back instead of issuing a new code: the transfer
 * already arrived, so a second order for the same plan would be a second
 * payment. Mirrors `create_payment_order` in backend/payments/services.py.
 */
export function blocksNewOrder(order: PaymentOrderRecord) {
  return order.status === "overpaid" || order.status === "review";
}
