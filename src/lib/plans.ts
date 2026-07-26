/**
 * Plan identity: the slug, the name and the one-line positioning.
 *
 * Deliberately no prices and no quotas. Both used to be repeated here on top of
 * `src/data/mock/plans.ts` and the backend catalogue, which is three copies of
 * the same number. Prices now come from `GET /api/engagement/plans/` (with the
 * test-pinned fallback in `src/data/mock/plans.ts`), and every cap comes from
 * that catalogue through `src/lib/plan-catalogue.ts`.
 */
export const PLANS = {
  seed: {
    key: "seed" as const,
    name: "Seed",
    icon: "🌱",
    tagline: "Bắt đầu khám phá",
    taglineEn: "Start exploring",
  },
  grow: {
    key: "grow" as const,
    name: "Grow",
    icon: "🌿",
    tagline: "Phát triển đều đặn",
    taglineEn: "Steady growth",
  },
  bloom: {
    key: "bloom" as const,
    name: "Bloom",
    icon: "🌳",
    tagline: "Nở rộ toàn diện",
    taglineEn: "Full bloom",
  },
  elite: {
    key: "elite" as const,
    name: "Elite",
    icon: "👑",
    tagline: "Đỉnh cao chuyên nghiệp",
    taglineEn: "Professional peak",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const PLAN_ORDER: PlanKey[] = ["seed", "grow", "bloom", "elite"];

export function normalizePlan(plan: unknown): PlanKey {
  if (typeof plan !== "string") return "seed";
  if (plan in PLANS) return plan as PlanKey;
  if (plan === "free") return "seed";
  if (plan === "pro") return "grow";
  if (plan === "plus") return "bloom";
  return "seed";
}

export function getPlanRank(plan: string): number {
  return PLAN_ORDER.indexOf(normalizePlan(plan));
}

export function planDisplayName(slug: string | null | undefined): string {
  return PLANS[normalizePlan(slug)].name;
}
