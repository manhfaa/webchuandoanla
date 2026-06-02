"use client";

import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";

import { pricingPlans } from "@/data/mock/plans";
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
  const { user } = useSessionStore();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chọn gói phù hợp"
      description="Chọn gói bạn muốn dùng để mở thêm tính năng và lưu lịch sử đầy đủ hơn."
      className="max-w-5xl"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-emerald-50/75">
        <Crown size={16} className="text-lime-200" />
        Gói hiện tại: {user?.currentPlan?.toUpperCase() ?? "FREE"}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pricingPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            dark
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
