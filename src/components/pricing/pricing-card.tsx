"use client";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanTier, PricingPlan } from "@/types";

const PLAN_RANK: Record<PlanTier, number> = {
  seed: 0,
  grow: 1,
  bloom: 2,
  elite: 3,
};

function rankOf(id: string): number {
  return PLAN_RANK[id as PlanTier] ?? 0;
}

export function PricingCard({
  plan,
  currentPlan = "seed",
  onSelect,
  dark = false,
}: {
  plan: PricingPlan;
  currentPlan?: PlanTier;
  onSelect?: (planId: PricingPlan["id"]) => void;
  dark?: boolean;
}) {
  const current = currentPlan ?? "seed";
  const isCurrent = current === plan.id;
  const curRank = rankOf(current);
  const pRank = rankOf(plan.id);

  const isEmphasized = Boolean(plan.highlight || dark);
  const isTopCurrent = isCurrent && plan.id === "elite";

  let actionLabel = plan.cta;
  let actionVariant: "primary" | "secondary" | "outline" | "ghostOnDark" = plan.highlight
    ? "secondary"
    : dark
      ? "outline"
      : "primary";

  if (!isCurrent && curRank > pRank) {
    const downgradeLabels: Record<PlanTier, string> = {
      seed: "Hạ cấp về Seed",
      grow: "Hạ cấp về Grow",
      bloom: "Hạ cấp về Bloom",
      elite: "Hạ cấp về Elite",
    };
    actionLabel = downgradeLabels[plan.id] ?? "Hạ cấp";
    actionVariant = dark ? "outline" : "secondary";
  }

  return (
    <Card
      glow={Boolean(plan.highlight) && !isCurrent}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg p-5 lg:p-6",
        dark
          ? "border-white/10 bg-white/5 text-white"
          : "border-white/75 bg-white/90 text-ink",
        plan.highlight &&
          !dark &&
          "bg-gradient-to-br from-[#0f221a] via-[#153524] to-[#10231c] text-white",
        isTopCurrent && "border-2 border-leaf-500 shadow-glow",
        isCurrent && plan.id !== "elite" && "border border-leaf-500/60 ring-1 ring-leaf-500/30",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,252,162,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(120,212,157,0.12),transparent_24%)]" />

      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{plan.icon}</span>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.28em]",
                  plan.highlight
                    ? "text-lime-200/80"
                    : dark
                      ? "text-emerald-100/70"
                      : "text-brand-700",
                )}
              >
                {plan.name}
              </p>
            </div>

            {plan.badge && !isCurrent ? (
              <Badge
                variant={plan.highlight ? "warning" : dark ? "locked" : "brand"}
                className="max-w-full whitespace-normal leading-5 no-underline"
              >
                {plan.badge}
              </Badge>
            ) : null}
          </div>

          <div>
            <h3
              className={cn(
                "max-w-full break-words font-display text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]",
                isEmphasized ? "text-white" : "text-ink",
              )}
            >
              {plan.price}
            </h3>
            <p
              className={cn(
                "mt-3 text-sm leading-7",
                isEmphasized ? "text-emerald-50/80" : "text-slate-600",
              )}
            >
              {plan.description}
            </p>
          </div>
        </div>

        <div className="mt-5 h-px w-full bg-gradient-to-r from-emerald-200/70 via-emerald-100/30 to-transparent" />

        <div className="mt-5 space-y-3">
          {plan.features.map((feature) => (
            <div
              key={feature}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-3",
                isEmphasized ? "bg-white/5" : "bg-emerald-50/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isEmphasized ? "bg-white/10 text-lime-200" : "bg-brand-100 text-brand-700",
                )}
              >
                <Check size={14} />
              </span>
              <p
                className={cn(
                  "text-sm leading-7",
                  isEmphasized ? "text-emerald-50/85" : "text-slate-700",
                )}
              >
                {feature}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-1">
          {isCurrent ? (
            <div
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-md border border-leaf-400/50 py-2.5 text-body-sm font-semibold",
                isTopCurrent ? "bg-leaf-500/20 text-leaf-100" : "bg-leaf-500/10 text-leaf-200",
              )}
            >
              <Check strokeWidth={2.5} className="h-4 w-4 shrink-0" aria-hidden />
              Đang sử dụng
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
    </Card>
  );
}
