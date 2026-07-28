import { pricingPlans } from "@/data/mock/plans";
import { applyCatalogue, type ServicePlanDto } from "@/lib/payments-client";
import { periodMultiple } from "@/lib/plan-catalogue";
import type { PricingPlan } from "@/types";

/**
 * A promotion is worth a page band only when the saving is one a grower would
 * act on. `periodMultiple` turns non-null the moment the term passes 30 days,
 * so SEPAY_SUBSCRIPTION_DAYS=31 — an operational nudge, not a campaign — would
 * otherwise light up a full-width band advertising "Tiết kiệm 3%".
 *
 * This is a display threshold, not an advertised number: it never appears in
 * copy, and it adds no campaign fact to a component.
 */
export const MIN_ANNOUNCEABLE_SAVING = 20;

const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

/**
 * The cheapest paid plan currently sold on a longer-than-standard term.
 *
 * Read on the server so the band is in the first HTML rather than appearing
 * later: the backend is a Render free service whose cold start runs to tens of
 * seconds, and a ~150px band materialising above a grower mid-scroll is worse
 * than no band at all. Failure is silent and returns null, which is also what
 * "no campaign" looks like — the surface is absent by default and has to be
 * switched on by the catalogue, never the other way round.
 */
export async function fetchPromotedPlan(): Promise<PricingPlan | null> {
  let catalogue: ServicePlanDto[];
  try {
    const base = DJANGO_BASE_URL.endsWith("/") ? DJANGO_BASE_URL : `${DJANGO_BASE_URL}/`;
    const response = await fetch(new URL("api/engagement/plans/", base), {
      // Long enough for a warm backend, short enough that a cold one cannot
      // hold the page render. Revalidated rather than cached forever so ending
      // the campaign takes effect without a deploy.
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    catalogue = (await response.json()) as ServicePlanDto[];
  } catch {
    return null;
  }

  if (!Array.isArray(catalogue) || catalogue.length === 0) return null;

  // One list, not two: `applyCatalogue` already attaches `promo` per row, so
  // resolving the card and the offer from the same pass makes a mismatch
  // impossible if the backend ever sells a plan the checked-in copy lacks.
  const promoted = applyCatalogue(pricingPlans, catalogue)
    .filter((plan) => plan.promo && plan.promo.savePercent >= MIN_ANNOUNCEABLE_SAVING)
    .sort((a, b) => amountOf(catalogue, a) - amountOf(catalogue, b));

  return promoted[0] ?? null;
}

function amountOf(catalogue: ServicePlanDto[], plan: PricingPlan): number {
  const row = catalogue.find((entry) => entry.slug === plan.id);
  const amount = Number(row?.price_monthly);
  return Number.isFinite(amount) ? amount : Number.POSITIVE_INFINITY;
}

/** Exported for tests: the same gate the band renders behind. */
export function isAnnounceable(plan: PricingPlan | null | undefined): boolean {
  return Boolean(plan?.promo && plan.promo.savePercent >= MIN_ANNOUNCEABLE_SAVING);
}

/** Re-exported so callers do not need to reach into plan-catalogue directly. */
export { periodMultiple };
