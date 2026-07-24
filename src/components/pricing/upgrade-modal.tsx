"use client";

import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";

import { pricingPlans } from "@/data/mock/plans";
import { useTr } from "@/lib/use-tr";
import { useSessionStore } from "@/store/session-store";

import { Modal } from "../ui/modal";
import { PricingCard } from "./pricing-card";

export function UpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const tr = useTr();
  const { user } = useSessionStore();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr("Chọn gói phù hợp", "Choose the right plan")}
      description={tr("Chọn gói bạn muốn dùng để mở thêm tính năng và lưu lịch sử đầy đủ hơn.", "Pick the plan you want to unlock more features and keep a fuller history.")}
      className="max-w-5xl"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-ink-soft">
        <Crown size={16} className="text-leaf-strong" />
        {tr("Gói hiện tại:", "Current plan:")} {user?.currentPlan?.toUpperCase() ?? "FREE"}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pricingPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            currentPlan={user?.currentPlan}
            onSelect={(planId) => {
              if (planId === "seed") {
                router.push("/dashboard/pricing");
                onClose();
                return;
              }
              router.push(`/dashboard/pricing/checkout/${planId}`);
              onClose();
            }}
          />
        ))}
      </div>
    </Modal>
  );
}
