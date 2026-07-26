"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Leaf, Plus, Sparkles } from "lucide-react";

import { ConfirmDialog } from "@/components/crop-plans/confirm-dialog";
import { CropPlanListCard } from "@/components/crop-plans/crop-plan-list-card";
import { ReminderCenter } from "@/components/crop-plans/reminder-center";
import { QuotaHint } from "@/components/plan/quota-hint";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  deleteCropPlan,
  fetchCropPlans,
  fetchReminders,
  updateCropPlan,
  type CropPlanListItem,
} from "@/lib/crop-plans-client";
import { useEntitlements } from "@/lib/use-entitlements";
import { useTr } from "@/lib/use-tr";
import { useSessionStore } from "@/store/session-store";

const PAGE_SIZE = 10;

type PendingConfirm =
  | { kind: "archive"; plan: CropPlanListItem }
  | { kind: "delete"; plan: CropPlanListItem }
  | null;

export default function CropPlansPage() {
  const tr = useTr();
  const { accessToken } = useSessionStore();
  const [plans, setPlans] = useState<CropPlanListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PendingConfirm>(null);
  const [actionPending, setActionPending] = useState(false);
  const [reminderKey, setReminderKey] = useState(0);
  /**
   * Plans that count against the cap. Taken from the unarchived listing only,
   * so switching "show archived" on cannot make the quota look bigger than it
   * is. A 402 overwrites this with the server's own count.
   */
  const [quotaUsed, setQuotaUsed] = useState<number | null>(null);
  const { quota, upgradeFor } = useEntitlements();
  const planQuota = quota("crop_plans", quotaUsed);
  const upgradePlan = planQuota.exhausted ? upgradeFor("crop_plans") : null;

  const loadPlans = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [planData, reminderData] = await Promise.all([
        fetchCropPlans(accessToken, { page, pageSize: PAGE_SIZE, includeArchived }),
        fetchReminders(accessToken, { filter: "today", pageSize: 1 }),
      ]);
      setPlans(planData.results);
      setTotal(planData.count);
      setHasNext(Boolean(planData.next));
      setTodayCount(reminderData.count);
      if (!includeArchived) setQuotaUsed(planData.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Không tải được danh sách kế hoạch.", "Could not load the plan list."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, includeArchived]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const activePlans = useMemo(
    () => plans.filter((plan) => ["active", "needs_review", "paused"].includes(plan.status)),
    [plans],
  );

  async function handleUnarchive(plan: CropPlanListItem) {
    if (!accessToken) return;
    try {
      setActionPending(true);
      await updateCropPlan(accessToken, plan.id, { status: "active" });
      toast.success(tr("Đã khôi phục kế hoạch.", "Plan restored."));
      await loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không khôi phục được kế hoạch.", "Could not restore the plan."));
    } finally {
      setActionPending(false);
    }
  }

  async function handleConfirm() {
    if (!accessToken || !confirming) return;
    const { kind, plan } = confirming;
    try {
      setActionPending(true);
      if (kind === "archive") {
        await updateCropPlan(accessToken, plan.id, { status: "archived" });
        toast.success(tr("Đã lưu trữ kế hoạch.", "Plan archived."));
      } else {
        await deleteCropPlan(accessToken, plan.id);
        toast.success(tr("Đã xóa kế hoạch.", "Plan deleted."));
      }
      setConfirming(null);
      setReminderKey((current) => current + 1);
      await loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Thao tác không thành công.", "The action did not go through."));
    } finally {
      setActionPending(false);
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The cap applies to creating a new plan only — every plan already saved stays
  // listed and openable — so the create control is what changes, nothing else.
  const createAction = planQuota.exhausted ? (
    <Link
      href={upgradePlan ? `/dashboard/pricing/checkout/${upgradePlan.slug}` : "/dashboard/pricing"}
      className={buttonVariants({ variant: "secondary" })}
    >
      <Sparkles strokeWidth={1.75} className="h-4 w-4" aria-hidden />
      {upgradePlan
        ? tr(`Nâng cấp ${upgradePlan.name} để tạo thêm`, `Upgrade to ${upgradePlan.name} to create more`)
        : tr("Xem gói để tạo thêm kế hoạch", "See plans to create more")}
    </Link>
  ) : (
    <Link href="/dashboard/crop-plans/new" className="no-underline">
      <Button>
        <Plus strokeWidth={1.75} className="h-4 w-4" aria-hidden />
        {tr("Tạo kế hoạch mới", "Create new plan")}
      </Button>
    </Link>
  );

  return (
    <div className="fl-stagger mx-auto max-w-[1320px] space-y-6">
      <Card variant="raised" padding="lg" className="field-contours rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-overline text-leaf-strong">{tr("Kế hoạch canh tác", "Crop planning")}</p>
            <h2 className="mt-2 text-h2 font-bold text-ink sm:text-h1">{tr("Kế hoạch trồng cây của bạn", "Your crop plans")}</h2>
            <p className="mt-3 max-w-3xl text-body text-ink-soft sm:text-body-lg">
              {tr("Xem các vụ đang chạy, việc cần làm hôm nay và mở nhanh timeline chăm cây theo địa điểm.", "See active crops, today's tasks, and quickly open the care timeline by location.")}
            </p>
            <QuotaHint limitKey="crop_plans" used={quotaUsed} className="mt-4" showUpgrade={false} />
          </div>
          {createAction}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="dark" className="rounded-lg shadow-sm">
          <p className="text-overline text-on-forest-muted">{tr("Kế hoạch đang theo dõi", "Plans being tracked")}</p>
          <p className="mt-3 font-display text-4xl font-bold text-on-forest">{activePlans.length}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-on-forest-muted">
            {tr("Số vụ trồng đang được theo dõi trong hệ thống.", "Number of crops currently tracked in the system.")}
          </p>
        </Card>
        <Card variant="default" className="rounded-lg shadow-sm">
          <p className="text-overline text-leaf-strong">{tr("Nhắc việc hôm nay", "Today's reminders")}</p>
          <p className="mt-3 font-display text-4xl font-bold text-ink">{todayCount}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-soft">
            {tr("Tổng số thông báo cần xem trong ngày.", "Total notifications to review today.")}
          </p>
        </Card>
        <Card variant={plans.some((plan) => plan.status === "needs_review") ? "warning" : "default"} className="rounded-lg shadow-sm">
          <p className="text-overline text-leaf-strong">{tr("Cần xem lại", "Needs review")}</p>
          <p className="mt-3 font-display text-4xl font-bold text-ink">
            {plans.filter((plan) => plan.status === "needs_review").length}
          </p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-soft">
            {tr("Kế hoạch bị ảnh hưởng bởi thời tiết và cần điều chỉnh.", "Plans affected by weather that need adjustment.")}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-soft">
          {tr(`Đang hiển thị ${plans.length}/${total} kế hoạch`, `Showing ${plans.length} of ${total} plans`)}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setIncludeArchived((current) => !current);
            setPage(1);
          }}
        >
          {includeArchived ? tr("Ẩn kế hoạch đã lưu trữ", "Hide archived plans") : tr("Hiện kế hoạch đã lưu trữ", "Show archived plans")}
        </Button>
      </div>

      {error ? <ErrorState title={tr("Chưa tải được kế hoạch", "Could not load plans")} description={error} onRetry={() => void loadPlans()} /> : null}

      {loading ? <ListSkeleton count={3} itemClassName="h-[220px]" /> : null}

      {!loading && !error && !plans.length ? (
        <EmptyState
          title={tr("Chưa có kế hoạch trồng nào", "No crop plans yet")}
          description={
            planQuota.exhausted
              ? tr(
                  "Gói hiện tại chưa kèm kế hoạch trồng cây. Nâng cấp để lập lịch chăm cây theo từng bước, có nhắc việc và cảnh báo thời tiết.",
                  "Your current plan does not include crop plans. Upgrade to build a step-by-step care schedule with reminders and weather alerts.",
                )
              : tr("Tạo kế hoạch đầu tiên để theo dõi mùa vụ, nhắc việc và thời tiết cho từng bước chăm cây.", "Create your first plan to track the season, reminders, and weather for each care step.")
          }
          icon={Leaf}
          action={createAction}
        />
      ) : null}

      {!loading && plans.length ? (
        <div className="space-y-4">
          {plans.map((plan) => (
            <CropPlanListCard
              key={plan.id}
              plan={plan}
              pending={actionPending}
              onArchive={(target) => setConfirming({ kind: "archive", plan: target })}
              onUnarchive={(target) => void handleUnarchive(target)}
              onDelete={(target) => setConfirming({ kind: "delete", plan: target })}
            />
          ))}
        </div>
      ) : null}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-body-sm text-ink-soft">{tr(`Trang ${page}/${lastPage}`, `Page ${page}/${lastPage}`)}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
              <ChevronLeft size={14} />
              {tr("Trước", "Previous")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPage((current) => current + 1)} disabled={!hasNext || loading}>
              {tr("Sau", "Next")}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}

      <ReminderCenter
        accessToken={accessToken}
        refreshKey={reminderKey}
        title="Việc cần làm cho tất cả kế hoạch"
        titleEn="To do across all plans"
      />

      <ConfirmDialog
        open={confirming?.kind === "archive"}
        title={tr("Lưu trữ kế hoạch này?", "Archive this plan?")}
        description={
          confirming
            ? tr(
                `“${confirming.plan.title}” sẽ được ẩn khỏi danh sách chính.`,
                `"${confirming.plan.title}" will be hidden from the main list.`,
              )
            : ""
        }
        consequences={[
          tr("Toàn bộ bước chăm cây và nhắc việc vẫn được giữ nguyên.", "All care steps and reminders are kept."),
          tr("Bạn có thể khôi phục bất cứ lúc nào bằng nút “Hiện kế hoạch đã lưu trữ”.", "You can restore it any time via \"Show archived plans\"."),
        ]}
        confirmLabel={tr("Lưu trữ", "Archive")}
        pending={actionPending}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirming?.kind === "delete"}
        danger
        title={tr("Xóa vĩnh viễn kế hoạch này?", "Permanently delete this plan?")}
        description={
          confirming
            ? tr(
                `“${confirming.plan.title}” sẽ bị xóa và không khôi phục được.`,
                `"${confirming.plan.title}" will be deleted and cannot be recovered.`,
              )
            : ""
        }
        consequences={
          confirming
            ? [
                tr(
                  `${confirming.plan.step_count} bước chăm cây sẽ bị xóa, bao gồm ${confirming.plan.completed_step_count} bước đã hoàn thành.`,
                  `${confirming.plan.step_count} care steps will be removed, including ${confirming.plan.completed_step_count} already completed.`,
                ),
                tr(
                  `${confirming.plan.reminder_count ?? 0} nhắc việc của kế hoạch này sẽ bị xóa.`,
                  `${confirming.plan.reminder_count ?? 0} reminders for this plan will be removed.`,
                ),
                tr("Nếu chỉ muốn ẩn kế hoạch, hãy chọn “Lưu trữ” thay vì xóa.", "Choose \"Archive\" instead if you only want to hide the plan."),
              ]
            : []
        }
        confirmLabel={tr("Xóa kế hoạch", "Delete plan")}
        pending={actionPending}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
