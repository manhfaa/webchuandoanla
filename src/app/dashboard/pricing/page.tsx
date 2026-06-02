"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { ComparisonTable } from "@/components/pricing/comparison-table";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Card } from "@/components/ui/card";
import { pricingPlans } from "@/data/mock/plans";
import { normalizePlan, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import type { PlanTier } from "@/types";

const PLAN_TAGLINES: Record<PlanTier, string> = {
  seed: "Bắt đầu khám phá, không rào cản.",
  grow: "Tần suất ổn định cho nhu cầu thường xuyên.",
  bloom: "Đầy đủ tính năng với chat chuyên gia.",
  elite: "Đỉnh cao chuyên nghiệp với PDF và API.",
};

export default function DashboardPricingPage() {
  const router = useRouter();
  const { user } = useSessionStore();
  const currentPlan = normalizePlan(user?.currentPlan);
  const currentPlanInfo = PLANS[currentPlan];

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] border-white/10 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-800 text-white shadow-float ring-1 ring-white/10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/60">
              Gói dịch vụ
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold">
              Chọn gói phù hợp với tần suất sử dụng của bạn.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/75">
              Seed miễn phí để dùng thử. Grow cho người dùng thường xuyên. Bloom đầy đủ tính năng. Elite cho chuyên gia.
            </p>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-lime-100">
              <Sparkles size={16} />
              Gói hiện tại: {currentPlanInfo.icon} {currentPlanInfo.name}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Value Proposition
            </p>
            <div className="mt-3 space-y-3">
              {pricingPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    if (plan.id === "seed") return;
                    router.push(`/dashboard/pricing/checkout/${plan.id}`);
                  }}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    currentPlan === plan.id
                      ? "border-lime-200/70 bg-lime-200/15 text-lime-50"
                      : "border-white/10 bg-white/5 text-emerald-50/85 hover:bg-white/10",
                  )}
                >
                  <p className="text-sm font-semibold">
                    {plan.icon} {plan.name}: {PLAN_TAGLINES[plan.id]}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-emerald-50/75">{plan.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
        {pricingPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            dark
            currentPlan={currentPlan}
            onSelect={(planId) => {
              if (planId === "seed") return;
              router.push(`/dashboard/pricing/checkout/${planId}`);
            }}
          />
        ))}
      </div>

      <ComparisonTable />
    </div>
  );
}
