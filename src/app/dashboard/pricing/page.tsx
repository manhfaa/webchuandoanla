"use client";

import { useRouter } from "next/navigation";
import { Crown, ShieldCheck, Sparkles, Sprout, TrendingUp } from "lucide-react";

import { ComparisonTable } from "@/components/pricing/comparison-table";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Card } from "@/components/ui/card";
import { pricingPlans } from "@/data/mock/plans";
import { normalizePlan, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import type { PlanTier } from "@/types";

const PLAN_TAGLINES: Record<PlanTier, string> = {
  seed: "Bắt đầu kiểm tra và lưu lịch sử ngắn.",
  grow: "Tăng lượt sử dụng và mở kế hoạch trồng.",
  bloom: "Theo dõi đầy đủ với tư vấn nâng cao.",
  elite: "Báo cáo và tích hợp cho nhu cầu chuyên sâu.",
};

const PLAN_ICONS = { seed: Sprout, grow: TrendingUp, bloom: ShieldCheck, elite: Crown };

export default function DashboardPricingPage() {
  const router = useRouter();
  const { user } = useSessionStore();
  const currentPlan = normalizePlan(user?.currentPlan);
  const currentPlanInfo = PLANS[currentPlan];

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <Card variant="dark" padding="lg" className="field-contours overflow-hidden rounded-xl">
        <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-overline text-on-forest-muted">Gói dịch vụ</p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-on-forest sm:text-[42px]">Chọn mức sử dụng phù hợp với khu vườn của bạn</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-forest-muted">Bắt đầu miễn phí, sau đó nâng cấp khi bạn cần nhiều lượt kiểm tra, lịch sử dài hơn hoặc thêm công cụ theo dõi.</p>
          </div>
          <div className="rounded-xl border border-on-forest/10 bg-on-forest/5 p-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-on-forest/10 px-4 py-2 text-sm font-semibold text-on-forest"><Sparkles size={16} aria-hidden /> Gói hiện tại: {currentPlanInfo.name}</div>
            <p className="mt-5 text-overline text-on-forest-muted">Quyền lợi theo từng mức</p>
            <div className="mt-3 space-y-2">
              {pricingPlans.map((plan) => {
                const Icon = PLAN_ICONS[plan.id];
                return (
                  <button key={plan.id} type="button" onClick={() => { if (plan.id !== "seed") router.push(`/dashboard/pricing/checkout/${plan.id}`); }} className={cn("flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition", currentPlan === plan.id ? "border-on-forest/25 bg-on-forest/10" : "border-on-forest/10 bg-on-forest/[0.03] hover:bg-on-forest/[0.07]")}>
                    <Icon size={17} className="mt-0.5 shrink-0 text-on-forest" aria-hidden />
                    <span><span className="block text-sm font-bold text-on-forest">{plan.name}</span><span className="mt-1 block text-xs leading-6 text-on-forest-muted">{PLAN_TAGLINES[plan.id]}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {pricingPlans.map((plan) => <PricingCard key={plan.id} plan={plan} currentPlan={currentPlan} onSelect={(planId) => { if (planId !== "seed") router.push(`/dashboard/pricing/checkout/${planId}`); }} />)}
      </div>

      <ComparisonTable />
    </div>
  );
}
