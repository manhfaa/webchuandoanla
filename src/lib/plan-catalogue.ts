/**
 * Reads caps out of the plan catalogue (`GET /api/engagement/plans/`).
 *
 * Every quota the UI shows comes through here, so a number is only ever written
 * once — in `ServicePlan.metadata` — and the pricing cards, the checkout screen
 * and the in-app quota hints cannot drift from what is actually enforced.
 *
 * The two catalogue conventions are NOT the same and are mirrored from
 * `backend/payments/entitlements.py`:
 *   `_cap()`           – 0 (or missing) means UNLIMITED.
 *   `_crop_plan_cap()` – 0 means literally zero allowed; null/"" means unlimited.
 */

import type { LimitKey } from "@/lib/plan-limit";
import type { ServicePlanDto } from "@/lib/payments-client";

/** `null` is "no cap"; `undefined` is "the catalogue does not say". */
export type Cap = number | null | undefined;

export const UNLIMITED = null;

type Bilingual = { vi: string; en: string };

function rawValue(plan: ServicePlanDto | null | undefined, key: string): unknown {
  return plan?.metadata?.[key];
}

/** Caps that follow the `_cap()` convention: 0 or unusable means unlimited. */
export function readCap(plan: ServicePlanDto | null | undefined, key: string): Cap {
  const value = rawValue(plan, key);
  if (value === undefined) return undefined;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return UNLIMITED;
  return amount <= 0 ? UNLIMITED : amount;
}

/** Crop plans are the exception: 0 really is zero, null/"" is unlimited. */
export function readCropPlanCap(plan: ServicePlanDto | null | undefined): Cap {
  const value = rawValue(plan, "crop_plans");
  // Absent means the catalogue has not been told yet — say nothing rather than
  // inventing the default that only the backend is allowed to apply.
  if (value === undefined) return undefined;
  if (value === null || value === "") return UNLIMITED;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return undefined;
  return Math.max(0, amount);
}

/** The cap a plan sells for one entitlement key, in the catalogue's own terms. */
export function catalogueCap(plan: ServicePlanDto | null | undefined, key: LimitKey): Cap {
  switch (key) {
    case "daily_diagnoses":
      return readCap(plan, "daily_diagnoses");
    case "history_days":
      return readCap(plan, "history_days");
    case "daily_chat_messages":
      return readCap(plan, "chat_daily");
    case "crop_plans":
      return readCropPlanCap(plan);
    case "monthly_diagnoses": {
      const amount = plan?.max_diagnoses_per_month;
      if (typeof amount !== "number") return undefined;
      return amount <= 0 ? UNLIMITED : amount;
    }
    default:
      return undefined;
  }
}

/** Ranks two caps so "which plan lifts this?" never compares `null` as zero. */
function isBetterCap(candidate: Cap, current: Cap): boolean {
  if (candidate === undefined) return false;
  if (candidate === UNLIMITED) return current !== UNLIMITED;
  if (current === UNLIMITED) return false;
  if (current === undefined) return true;
  return candidate > current;
}

function priceOf(plan: ServicePlanDto): number {
  const amount = Number(plan.price_monthly);
  return Number.isFinite(amount) ? amount : Number.POSITIVE_INFINITY;
}

/* ------------------------------------------------------- billing period --- */

/** What `price_monthly` is priced against when no promotion is running. */
export const STANDARD_PERIOD_DAYS = 30;

/**
 * Days one purchase actually buys, as the catalogue reports it.
 *
 * The backend applies `SEPAY_SUBSCRIPTION_DAYS` to every activation and writes
 * the result to `plan_expires_at`, so a promotion is one env var rather than a
 * new SKU — and the same env var is what this reads. An older backend that does
 * not publish the field falls back to the standard period, which is what it was
 * granting anyway.
 */
export function subscriptionDays(plan: ServicePlanDto | null | undefined): number {
  const raw = plan?.subscription_days;
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return STANDARD_PERIOD_DAYS;
  return Math.floor(amount);
}

/**
 * How many standard periods one purchase now covers, or `null` when the term is
 * the ordinary one. Used to decide whether there is a promotion to announce at
 * all — nothing in the UI hardcodes "90".
 */
export function periodMultiple(plan: ServicePlanDto | null | undefined): number | null {
  const days = subscriptionDays(plan);
  if (days <= STANDARD_PERIOD_DAYS) return null;
  return days / STANDARD_PERIOD_DAYS;
}

/** Whole percent saved against buying the same span one standard period at a time. */
export function periodSavingsPercent(plan: ServicePlanDto | null | undefined): number {
  const multiple = periodMultiple(plan);
  if (!multiple) return 0;
  return Math.round((1 - 1 / multiple) * 100);
}

/** Catalogue order the user actually shops in: cheapest first. */
export function byPrice(catalogue: ServicePlanDto[]): ServicePlanDto[] {
  return [...catalogue].filter((plan) => plan.is_active).sort((a, b) => priceOf(a) - priceOf(b));
}

/** The next plan up by price — the same move `next_plan_slug` makes server-side. */
export function nextPlanUp(catalogue: ServicePlanDto[] | null, currentSlug: string): ServicePlanDto | null {
  if (!catalogue?.length) return null;
  const ordered = byPrice(catalogue);
  const index = ordered.findIndex((plan) => plan.slug === currentSlug);
  if (index < 0) return ordered[0] ?? null;
  return ordered[index + 1] ?? null;
}

/**
 * The cheapest plan on sale that raises `key` above what `currentSlug` gets.
 * Used for the pre-emptive hint; a 402 carries its own `upgrade_to`.
 */
export function planThatLifts(
  catalogue: ServicePlanDto[] | null,
  key: LimitKey,
  currentSlug: string,
): ServicePlanDto | null {
  if (!catalogue?.length) return null;
  const ordered = byPrice(catalogue);
  const current = ordered.find((plan) => plan.slug === currentSlug) ?? null;
  const currentCap = catalogueCap(current, key);
  const better = ordered.find((plan) => plan.slug !== currentSlug && isBetterCap(catalogueCap(plan, key), currentCap));
  if (better) return better;
  // The catalogue carries no metadata for this cap yet (crop_plans is resolved
  // from a backend default today), so there is nothing to compare. Point at the
  // next plan up rather than dropping the upgrade path entirely.
  return currentCap === undefined ? nextPlanUp(catalogue, currentSlug) : null;
}

/** The cheapest plan on sale that includes a feature the current plan lacks. */
export function planThatUnlocks(
  catalogue: ServicePlanDto[] | null,
  includes: (plan: ServicePlanDto) => boolean,
): ServicePlanDto | null {
  if (!catalogue?.length) return null;
  return byPrice(catalogue).find(includes) ?? null;
}

export function planNamed(catalogue: ServicePlanDto[] | null, slug: string | null | undefined): ServicePlanDto | null {
  if (!catalogue?.length || !slug) return null;
  return catalogue.find((plan) => plan.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ copy --- */

/** Units are copy, not caps: the amount always arrives from the catalogue. */
const UNITS: Record<LimitKey, { unit: Bilingual; unlimited: Bilingual }> = {
  daily_diagnoses: {
    unit: { vi: "lượt/ngày", en: "checks/day" },
    unlimited: { vi: "Không giới hạn", en: "Unlimited" },
  },
  monthly_diagnoses: {
    unit: { vi: "lượt/tháng", en: "checks/month" },
    unlimited: { vi: "Không giới hạn", en: "Unlimited" },
  },
  history_days: {
    unit: { vi: "ngày", en: "days" },
    unlimited: { vi: "Toàn bộ", en: "All of it" },
  },
  daily_chat_messages: {
    unit: { vi: "câu/ngày", en: "messages/day" },
    unlimited: { vi: "Không giới hạn", en: "Unlimited" },
  },
  crop_plans: {
    unit: { vi: "kế hoạch", en: "plans" },
    unlimited: { vi: "Không giới hạn", en: "Unlimited" },
  },
};

export function limitUnit(key: LimitKey): Bilingual {
  return UNITS[key].unit;
}

export function unlimitedLabel(key: LimitKey): Bilingual {
  return UNITS[key].unlimited;
}

/** "30 lượt/ngày" / "Không giới hạn"; `null` when the catalogue is silent. */
export function capLabel(key: LimitKey, cap: Cap): Bilingual | null {
  if (cap === undefined) return null;
  if (cap === UNLIMITED) return unlimitedLabel(key);
  const unit = limitUnit(key);
  return { vi: `${cap} ${unit.vi}`, en: `${cap} ${unit.en}` };
}

const FEATURE_LABELS: Record<LimitKey, Bilingual> = {
  daily_diagnoses: { vi: "Kiểm tra ảnh lá cây", en: "Leaf image checks" },
  monthly_diagnoses: { vi: "Tổng lượt kiểm tra mỗi tháng", en: "Total checks per month" },
  history_days: { vi: "Lưu lịch sử sử dụng", en: "Usage history kept" },
  daily_chat_messages: { vi: "Chat theo kết quả", en: "Chat about results" },
  crop_plans: { vi: "Kế hoạch trồng cây", en: "Crop plans" },
};

export function limitLabel(key: LimitKey): Bilingual {
  return FEATURE_LABELS[key];
}

/** Order the published comparison table sells these in. */
const QUOTA_ORDER: LimitKey[] = ["daily_diagnoses", "history_days", "daily_chat_messages", "crop_plans"];

/**
 * The benefit bullets for one plan, generated from its catalogue row.
 *
 * `extras` carries the qualitative copy a plan sells that has no number
 * (support level, processing priority); anything with a quota is derived here
 * so the marketing card and the enforced cap cannot disagree.
 */
export function catalogueFeatureLines(plan: ServicePlanDto, extras: Bilingual[] = []): Bilingual[] {
  const lines: Bilingual[] = [];

  for (const key of QUOTA_ORDER) {
    const cap = catalogueCap(plan, key);
    if (cap === undefined) continue;
    // A plan that sells zero of something is not advertising a benefit.
    if (cap === 0) continue;
    const label = capLabel(key, cap);
    if (!label) continue;
    const name = limitLabel(key);
    lines.push({ vi: `${name.vi}: ${label.vi}`, en: `${name.en}: ${label.en}` });
  }

  if (plan.rag_enabled) lines.push({ vi: "Đối chiếu triệu chứng với nguồn tham khảo", en: "Cross-check symptoms against references" });
  if (plan.expert_chat_enabled) lines.push({ vi: "Tư vấn nông nghiệp nâng cao", en: "Advanced agriculture advice" });
  if (plan.metadata?.reports === true) lines.push({ vi: "Xuất báo cáo PDF", en: "Export PDF reports" });

  return [...lines, ...extras];
}
