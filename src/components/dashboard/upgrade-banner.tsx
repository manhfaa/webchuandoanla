"use client";

import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { PlanTier } from "@/types";

export function UpgradeBanner({
  currentPlan,
}: {
  currentPlan: PlanTier;
}) {
  if (currentPlan !== "seed") {
    return null;
  }

  return (
    <div className="flex min-h-[88px] flex-col items-start gap-4 overflow-hidden rounded-lg border border-line bg-surface-soft px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-leaf-strong">
        <Crown strokeWidth={1.75} className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-overline text-leaf-strong">Gói hiện tại · {currentPlan.toUpperCase()}</p>
        <p className="mt-0.5 text-body font-semibold text-ink">
          Nâng cấp để lưu đầy đủ lịch sử và mở thêm hỗ trợ khi cần.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dashboard/pricing"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <Sparkles strokeWidth={1.75} className="h-4 w-4" />
          Nâng cấp
        </Link>
        <Link
          href="/dashboard/pricing"
          className={buttonVariants({ variant: "tertiary", size: "sm", className: "hidden sm:inline-flex" })}
        >
          Chi tiết
        </Link>
      </div>
    </div>
  );
}
