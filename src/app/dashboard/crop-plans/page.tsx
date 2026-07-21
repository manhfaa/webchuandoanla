"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Leaf, Plus, Sprout, TriangleAlert } from "lucide-react";

import { CropPlanListCard } from "@/components/crop-plans/crop-plan-list-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { fetchCropPlans, fetchReminders } from "@/lib/crop-plans-client";
import { useSessionStore } from "@/store/session-store";
import type { CropPlan, ReminderItem } from "@/types";

export default function CropPlansPage() {
  const { accessToken } = useSessionStore();
  const [plans, setPlans] = useState<CropPlan[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setLoading(true);
        const [planData, reminderData] = await Promise.all([
          fetchCropPlans(accessToken),
          fetchReminders(accessToken, "today"),
        ]);
        setPlans(planData);
        setReminders(reminderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được danh sách kế hoạch.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const activePlans = useMemo(
    () => plans.filter((plan) => ["active", "needs_review", "paused"].includes(plan.status)),
    [plans],
  );

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <Card variant="raised" padding="lg" className="field-contours rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-overline text-leaf-strong">Kế hoạch canh tác</p>
            <h1 className="mt-2 text-h2 font-bold text-ink sm:text-h1">Kế hoạch trồng cây của bạn</h1>
            <p className="mt-3 max-w-3xl text-body text-ink-soft sm:text-body-lg">
              Xem các vụ đang chạy, việc cần làm hôm nay và mở nhanh timeline chăm cây theo địa điểm.
            </p>
          </div>
          <Link href="/dashboard/crop-plans/new" className="no-underline">
            <Button>
              <Plus strokeWidth={1.75} className="h-4 w-4" aria-hidden />
              Tạo kế hoạch mới
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="dark" className="rounded-lg shadow-sm">
          <p className="text-overline text-on-forest-muted">Kế hoạch đang theo dõi</p>
          <p className="mt-3 font-display text-4xl font-bold text-on-forest">{activePlans.length}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-on-forest-muted">
            Số vụ trồng đang được theo dõi trong hệ thống.
          </p>
        </Card>
        <Card variant="default" className="rounded-lg shadow-sm">
          <p className="text-overline text-leaf-strong">Nhắc việc hôm nay</p>
          <p className="mt-3 font-display text-4xl font-bold text-ink">{reminders.length}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-soft">
            Tổng số thông báo cần xem trong ngày.
          </p>
        </Card>
        <Card variant={plans.some((plan) => plan.status === "needs_review") ? "warning" : "default"} className="rounded-lg shadow-sm">
          <p className="text-overline text-leaf-strong">Cần xem lại</p>
          <p className="mt-3 font-display text-4xl font-bold text-ink">
            {plans.filter((plan) => plan.status === "needs_review").length}
          </p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-soft">
            Kế hoạch bị ảnh hưởng bởi thời tiết và cần điều chỉnh.
          </p>
        </Card>
      </div>

      {error ? <ErrorState title="Chưa tải được kế hoạch" description={error} onRetry={() => window.location.reload()} /> : null}

      {loading ? <LoadingState title="Đang tải kế hoạch trồng" description="Agromind AI đang lấy tiến độ và nhắc việc của bạn." /> : null}

      {!loading && !plans.length ? (
        <EmptyState title="Chưa có kế hoạch trồng nào" description="Tạo kế hoạch đầu tiên để theo dõi mùa vụ, nhắc việc và thời tiết cho từng bước chăm cây." icon={Leaf} action={<Link href="/dashboard/crop-plans/new" className="no-underline"><Button><Sprout strokeWidth={1.75} className="h-4 w-4" aria-hidden /> Tạo kế hoạch mới</Button></Link>} />
      ) : null}

      {!loading && plans.length ? (
        <div className="space-y-4">
          {plans.map((plan) => (
            <CropPlanListCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : null}

      {reminders.length ? (
        <Card variant="warning" className="rounded-lg">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-sun/20 p-3 text-soil">
              <TriangleAlert strokeWidth={1.75} className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-h3 font-bold text-ink">Cần làm trong hôm nay</h3>
              <p className="mt-2 text-body leading-relaxed text-ink-soft">
                {reminders[0].title}: {reminders[0].body}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
