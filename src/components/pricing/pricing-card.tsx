"use client";

import { CalendarClock, Check, Crown, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import type { PlanTier, PricingPlan } from "@/types";

function formatPlanDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

const PLAN_RANK: Record<PlanTier, number> = {
  seed: 0,
  grow: 1,
  bloom: 2,
  elite: 3,
};

function rankOf(id: string): number {
  return PLAN_RANK[id as PlanTier] ?? 0;
}

const planIcons = {
  seed: Sprout,
  grow: TrendingUp,
  bloom: ShieldCheck,
  elite: Crown,
};

export function PricingCard({
  plan,
  currentPlan = "seed",
  currentPlanExpiresAt = null,
  onSelect,
  dark = false,
}: {
  plan: PricingPlan;
  currentPlan?: PlanTier;
  /** Expiry of the plan the account is on, used to explain lower-tier cards. */
  currentPlanExpiresAt?: string | null;
  onSelect?: (planId: PricingPlan["id"]) => void;
  dark?: boolean;
}) {
  const tr = useTr();
  const current = currentPlan ?? "seed";
  const isCurrent = current === plan.id;
  const curRank = rankOf(current);
  const pRank = rankOf(plan.id);

  const isEmphasized = Boolean(plan.highlight || dark);
  const isTopCurrent = isCurrent && plan.id === "elite";
  const PlanIcon = planIcons[plan.id as PlanTier] ?? Sprout;

  // Plans are prepaid 30-day passes with no auto-renew: there is nothing to
  // downgrade to, the current plan simply runs out and the account falls back
  // to Seed. So a lower tier gets that explanation instead of a CTA that the
  // backend rejects (or, for Seed, one that used to do nothing at all).
  const isLowerTier = !isCurrent && curRank > pRank;
  const expiryLabel = currentPlanExpiresAt ? formatPlanDate(currentPlanExpiresAt) : "";

  const actionLabel = tr(plan.cta, plan.ctaEn ?? plan.cta);
  const actionVariant: "primary" | "secondary" | "outline" | "ghost" = plan.highlight
    ? "secondary"
    : dark
      ? "outline"
      : "primary";

  return (
    <SurfaceCard
      variant={plan.highlight || dark ? "dark" : "default"}
      className={cn(
        "relative flex h-full flex-col overflow-hidden p-5 lg:p-6",
        isTopCurrent && "border-2 border-leaf shadow-md",
        isCurrent && plan.id !== "elite" && "border border-leaf/60 ring-1 ring-leaf/30",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--mint),transparent_28%)] opacity-20" />

      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", isEmphasized ? "bg-on-forest/10 text-on-forest" : "bg-surface-soft text-leaf-strong")}>
                <PlanIcon size={18} aria-hidden />
              </span>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  plan.highlight || dark ? "text-on-forest-muted" : "text-ink-soft",
                )}
              >
                {plan.name}
              </p>
            </div>

            {plan.badge && !isCurrent ? (
              <Badge
                variant={plan.highlight ? "warning" : dark ? "locked" : "brand"}
                className={cn(
                  "max-w-full whitespace-nowrap leading-5 no-underline",
                  plan.highlight && "bg-sun px-3 py-1 text-[11px] font-bold text-forest shadow-sm",
                )}
              >
                {tr(plan.badge, plan.badgeEn ?? plan.badge)}
              </Badge>
            ) : null}
          </div>

          <div>
            <h3
              className={cn(
                "max-w-full whitespace-nowrap font-display text-[clamp(1.65rem,2vw,1.875rem)] font-bold leading-tight tracking-[-0.035em]",
                isEmphasized ? "text-on-forest" : "text-ink",
              )}
            >
              {tr(plan.price, plan.priceEn ?? plan.price)}
            </h3>
            {plan.promo ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "text-sm line-through",
                    isEmphasized ? "text-on-forest-muted" : "text-ink-soft",
                  )}
                >
                  {tr(plan.promo.strikePrice, plan.promo.strikePriceEn)}
                </span>
                <span className={cn("text-sm font-semibold", isEmphasized ? "text-on-forest" : "text-ink")}>
                  {tr(plan.promo.periodLabel, plan.promo.periodLabelEn)}
                </span>
                {plan.promo.savePercent > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      isEmphasized ? "bg-on-forest/15 text-on-forest" : "bg-leaf/15 text-leaf-strong",
                    )}
                  >
                    {tr(`Tiết kiệm ${plan.promo.savePercent}%`, `Save ${plan.promo.savePercent}%`)}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p
              className={cn(
                "mt-3 text-sm leading-7",
                isEmphasized ? "text-on-forest-muted" : "text-ink-soft",
              )}
            >
              {tr(plan.description, plan.descriptionEn ?? plan.description)}
            </p>
          </div>
        </div>

        <div className="mt-5 h-px w-full bg-gradient-to-r from-line via-line/50 to-transparent" />

        <div className="mt-5 space-y-3">
          {plan.features.map((feature, i) => (
            <div
              key={feature}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-3",
                isEmphasized ? "bg-on-forest/5" : "bg-surface-soft",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isEmphasized ? "bg-on-forest/10 text-on-forest" : "bg-surface text-leaf-strong",
                )}
              >
                <Check size={14} />
              </span>
              <p
                className={cn(
                  "text-sm leading-7",
                  isEmphasized ? "text-on-forest" : "text-ink",
                )}
              >
                {tr(feature, plan.featuresEn?.[i] ?? feature)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-1">
          {isCurrent ? (
            <div className="space-y-2">
              <div
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-md border py-2.5 text-body-sm font-semibold",
                  isTopCurrent
                    ? "border-leaf/50 bg-leaf/20 text-leaf"
                    : "border-line bg-surface-soft text-ink-soft",
                )}
              >
                <Check strokeWidth={2.5} className="h-4 w-4 shrink-0" aria-hidden />
                {tr("Đang sử dụng", "Currently active")}
              </div>
              {expiryLabel ? (
                <p className={cn("flex items-center justify-center gap-1.5 text-xs font-semibold", isEmphasized ? "text-on-forest-muted" : "text-ink-soft")}>
                  <CalendarClock size={13} aria-hidden />
                  {tr(`Hiệu lực đến ${expiryLabel}`, `Valid until ${expiryLabel}`)}
                </p>
              ) : null}
            </div>
          ) : isLowerTier ? (
            <div
              className={cn(
                "rounded-md border px-4 py-3 text-center",
                isEmphasized ? "border-on-forest/15 bg-on-forest/[0.06]" : "border-line bg-surface-soft",
              )}
            >
              <p className={cn("text-body-sm font-semibold", isEmphasized ? "text-on-forest" : "text-ink")}>
                {tr("Chưa thể chuyển xuống gói này", "Cannot switch down to this plan")}
              </p>
              <p className={cn("mt-1 text-xs leading-6", isEmphasized ? "text-on-forest-muted" : "text-ink-soft")}>
                {expiryLabel
                  ? tr(
                      `Gói hiện tại còn hiệu lực đến ${expiryLabel}. Sau ngày đó tài khoản tự về gói Seed và bạn có thể chọn gói này.`,
                      `Your current plan runs until ${expiryLabel}. After that the account returns to Seed and you can choose this plan.`,
                    )
                  : tr(
                      "Gói hiện tại vẫn còn hiệu lực. Khi hết hạn, tài khoản tự về gói Seed và bạn có thể chọn gói này.",
                      "Your current plan is still active. When it ends, the account returns to Seed and you can choose this plan.",
                    )}
              </p>
            </div>
          ) : (
            <Button
              variant={actionVariant}
              size="md"
              className="w-full"
              onClick={() => onSelect?.(plan.id)}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}
