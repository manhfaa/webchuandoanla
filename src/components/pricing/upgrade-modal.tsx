"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { pricingPlans } from "@/data/mock/plans";
import {
  applyCatalogue,
  fetchServicePlans,
  fetchSubscriptionSummary,
  type ServicePlanDto,
  type SubscriptionSummary,
} from "@/lib/payments-client";
import { normalizePlan } from "@/lib/plans";
import { useTr } from "@/lib/use-tr";
import { useSessionStore } from "@/store/session-store";

import { Modal } from "../ui/modal";
import { PricingCard } from "./pricing-card";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function UpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const tr = useTr();
  const { user, accessToken } = useSessionStore();
  const [catalogue, setCatalogue] = useState<ServicePlanDto[] | null>(null);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);

  // Prices and expiry are only needed once the grower actually opens the modal.
  useEffect(() => {
    if (!open || catalogue) return;
    let cancelled = false;
    void (async () => {
      const [catalogueResult, summaryResult] = await Promise.allSettled([
        fetchServicePlans(),
        accessToken ? fetchSubscriptionSummary(accessToken) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (catalogueResult.status === "fulfilled") setCatalogue(catalogueResult.value);
      if (summaryResult.status === "fulfilled" && summaryResult.value) setSummary(summaryResult.value);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, catalogue, accessToken]);

  const plans = useMemo(() => applyCatalogue(pricingPlans, catalogue), [catalogue]);
  const currentPlan = normalizePlan(summary?.current_plan ?? user?.currentPlan);
  const planExpiresAt = summary?.plan_expires_at ?? null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr("Chọn gói phù hợp", "Choose the right plan")}
      description={tr("Chọn gói bạn muốn dùng để mở thêm tính năng và lưu lịch sử đầy đủ hơn.", "Pick the plan you want to unlock more features and keep a fuller history.")}
      className="max-w-7xl"
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-ink-soft">
          <Crown size={16} className="text-leaf-strong" />
          {tr("Gói hiện tại:", "Current plan:")} {currentPlan.toUpperCase()}
        </span>
        {planExpiresAt ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <CalendarClock size={14} aria-hidden />
            {tr(`Hiệu lực đến ${formatDate(planExpiresAt)}`, `Valid until ${formatDate(planExpiresAt)}`)}
          </span>
        ) : null}
      </div>
      {/* Four plans, so four columns — at xl:grid-cols-3 Elite dropped onto a
          second row on its own. Needs max-w-7xl on the dialog to match: at
          max-w-5xl each card falls to ~232px, and the price line is
          whitespace-nowrap inside an overflow-hidden card, so "39.000đ/tháng"
          is clipped rather than wrapped. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            currentPlanExpiresAt={planExpiresAt}
            onSelect={(planId) => {
              router.push(`/dashboard/pricing/checkout/${planId}`);
              onClose();
            }}
          />
        ))}
      </div>
    </Modal>
  );
}
