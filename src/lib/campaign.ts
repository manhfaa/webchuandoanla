import { fetchPromotedPlan } from "@/lib/server-offer";
import type { PricingPlan } from "@/types";

/**
 * Campaign configuration — server-only.
 *
 * This exists because two different questions were previously answered by one
 * switch: "does the backend currently grant a longer term?" (an entitlement
 * fact, owned by SEPAY_SUBSCRIPTION_DAYS) and "are we running a campaign, and
 * how loudly?" (a marketing decision). Welding them meant the campaign could
 * not be scoped, scheduled or previewed.
 *
 * They are separated here, with one rule that is NOT configurable: the surfaces
 * still refuse to render unless the catalogue actually reports a longer term.
 * `CAMPAIGN_ENABLED` controls loudness. It cannot make the site claim something
 * the backend does not do.
 *
 * None of these are NEXT_PUBLIC_. A NEXT_PUBLIC_ var is inlined at build time,
 * which would make "turn it on" or "change the end date" a redeploy. Read on
 * the server, they take effect on the next ISR revalidation instead — the same
 * 300s window `server-offer.ts` already uses.
 */

export type CampaignSurface = "hero" | "band";

const ALL_SURFACES: readonly CampaignSurface[] = ["hero", "band"];

export type Campaign = {
  /** The plan the offer is about, with `promo` already attached. */
  plan: PricingPlan;
  /** Which surfaces may render. Lets one be pulled without a deploy. */
  surfaces: ReadonlySet<CampaignSurface>;
  /** Never rendered. Identity for analytics and any future dismissal key. */
  id: string;
};

/**
 * Unset means ON.
 *
 * The env var exists to turn the campaign OFF or to scope it — not to turn it
 * on. An unset variable must never be the reason the site looks like nothing is
 * running, because the real gate is already the catalogue check below: with no
 * promotional term there is nothing to show whatever this says.
 */
function enabled(): boolean {
  const raw = (process.env.CAMPAIGN_ENABLED ?? "").trim().toLowerCase();
  if (raw === "") return true;
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

/**
 * `CAMPAIGN_ENDS_AT` is a gate, not copy. Nothing renders the date, so there is
 * no countdown to drift and no timestamp in the SSR HTML to mismatch against
 * the client's clock. When it passes, both surfaces disappear on their own at
 * the next revalidation — no deploy.
 *
 * The value must carry an explicit offset (2026-08-31T23:59:59+07:00). A bare
 * date is parsed as UTC, which on a Vietnamese campaign ends it seven hours
 * early — so an unparseable or offset-less value is treated as "no end date"
 * rather than silently ending the campaign at the wrong moment.
 */
function stillRunning(now: number): boolean {
  const raw = (process.env.CAMPAIGN_ENDS_AT ?? "").trim();
  if (!raw) return true;
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) return true;
  const ends = Date.parse(raw);
  if (!Number.isFinite(ends)) return true;
  return now < ends;
}

/** Unset means every surface. Used to quieten the campaign without a deploy. */
function surfaces(): ReadonlySet<CampaignSurface> {
  const raw = (process.env.CAMPAIGN_SURFACES ?? "").trim().toLowerCase();
  if (!raw) return new Set(ALL_SURFACES);
  const asked = raw.split(",").map((part) => part.trim());
  const picked = ALL_SURFACES.filter((surface) => asked.includes(surface));
  // An unrecognised list is a typo, not an instruction to hide everything.
  return new Set(picked.length ? picked : ALL_SURFACES);
}

/**
 * The campaign to render, or null.
 *
 * Order matters: the catalogue is consulted last and is the only check that
 * cannot be overridden by configuration.
 */
export async function resolveCampaign(now = Date.now()): Promise<Campaign | null> {
  if (!enabled()) return null;
  if (!stillRunning(now)) return null;

  // The guard. `fetchPromotedPlan` returns a plan only when the live catalogue
  // reports a term beyond the standard one by a margin worth announcing, so a
  // campaign switched on against an unchanged backend shows nothing at all.
  const plan = await fetchPromotedPlan();
  if (!plan?.promo) return null;

  return {
    plan,
    surfaces: surfaces(),
    id: (process.env.CAMPAIGN_ID ?? "").trim() || "default",
  };
}
