"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Gauge, LockKeyhole } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { planNamed } from "@/lib/plan-catalogue";
import { FEATURE_LOCKED_CODE, onPlanLimit, type PlanLimitInfo } from "@/lib/plan-limit";
import { planDisplayName } from "@/lib/plans";
import { useEntitlements } from "@/lib/use-entitlements";
import { useTr } from "@/lib/use-tr";

import { Modal } from "../ui/modal";

/**
 * The one place a 402 becomes something the user can act on.
 *
 * Mounted once in the dashboard shell, so every screen that calls the API is
 * covered without repeating this: the API clients publish the structured detail
 * (`limit` / `used` / `upgrade_to`) and this explains the cap and links to the
 * plan that lifts it. Screens keep their own inline error copy for everything
 * that is not a plan limit.
 */
export function PlanLimitDialog() {
  const tr = useTr();
  const { catalogue } = useEntitlements();
  const [limitHit, setLimitHit] = useState<PlanLimitInfo | null>(null);

  useEffect(() => onPlanLimit((error) => setLimitHit(error.info)), []);

  if (!limitHit) return null;

  const close = () => setLimitHit(null);
  const upgradeSlug = limitHit.upgradeTo;
  const upgradeName = planNamed(catalogue, upgradeSlug)?.name ?? (upgradeSlug ? planDisplayName(upgradeSlug) : "");
  const currentName = planNamed(catalogue, limitHit.plan)?.name ?? (limitHit.plan ? planDisplayName(limitHit.plan) : "");
  // A locked feature was never "used up" — saying so would tell a Seed grower
  // they spent an allowance the plan never sold them.
  const featureLocked = limitHit.code === FEATURE_LOCKED_CODE;
  const showCounters = !featureLocked && (limitHit.limit !== null || limitHit.used !== null);

  // The backend sentence is the authoritative Vietnamese explanation; the
  // English side is rebuilt from the same numbers rather than re-typed copy.
  const englishMessage =
    limitHit.limit !== null && currentName && upgradeName
      ? `The ${currentName} plan includes ${limitHit.limit} of these. Upgrade to ${upgradeName} to continue.`
      : limitHit.message;

  return (
    <Modal
      open
      onClose={close}
      title={
        featureLocked
          ? tr("Tính năng này chưa có trong gói hiện tại", "This feature is not in your current plan")
          : tr("Đã hết hạn mức của gói hiện tại", "You have used up your plan's allowance")
      }
      description={tr(
        "Những gì bạn đã tạo vẫn được giữ nguyên. Hạn mức chỉ áp dụng cho lần tạo mới.",
        "Everything you already created is kept. The cap only applies to creating something new.",
      )}
      className="max-w-xl"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-sun/30 bg-sun-soft p-4">
          <LockKeyhole size={18} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
          <p className="text-sm leading-7 text-ink">{tr(limitHit.message, englishMessage)}</p>
        </div>

        {showCounters ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
              <dt className="text-xs font-semibold text-ink-soft">{tr("Gói hiện tại", "Current plan")}</dt>
              <dd className="mt-1 font-display text-lg font-bold text-ink">{currentName || "—"}</dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
              <dt className="text-xs font-semibold text-ink-soft">{tr("Hạn mức", "Allowance")}</dt>
              <dd className="mt-1 font-display text-lg font-bold text-ink tabular-nums">{limitHit.limit ?? "—"}</dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
              <dt className="text-xs font-semibold text-ink-soft">{tr("Đã dùng", "Used")}</dt>
              <dd className="mt-1 font-display text-lg font-bold text-ink tabular-nums">{limitHit.used ?? "—"}</dd>
            </div>
          </dl>
        ) : null}

        <p className="flex items-start gap-2 text-xs leading-6 text-ink-soft">
          <Gauge size={14} className="mt-1 shrink-0 text-leaf-strong" aria-hidden />
          {tr(
            "Hạn mức sẽ được tính lại theo gói bạn đang dùng. Bạn vẫn mở và xem được mọi dữ liệu đã lưu trước đó.",
            "The allowance follows the plan you are on. You can still open and read everything you saved before.",
          )}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="tertiary" onClick={close}>
            {tr("Để sau", "Not now")}
          </Button>
          <Link href="/dashboard/pricing" onClick={close} className={buttonVariants({ variant: "secondary" })}>
            {tr("So sánh các gói", "Compare plans")}
          </Link>
          {upgradeSlug ? (
            <Link
              href={`/dashboard/pricing/checkout/${upgradeSlug}`}
              onClick={close}
              className={buttonVariants({ variant: "primary" })}
            >
              {tr(`Nâng cấp lên ${upgradeName}`, `Upgrade to ${upgradeName}`)}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
