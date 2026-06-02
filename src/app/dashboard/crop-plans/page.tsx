"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Leaf, Plus, Sprout, TriangleAlert } from "lucide-react";

import { CropPlanListCard } from "@/components/crop-plans/crop-plan-list-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-6">
      <Card className="rounded-lg border-emerald-100/70 bg-gradient-to-br from-white via-[#f5fceb] to-emerald-50 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-overline text-leaf-700">Kế hoạch canh tác</p>
            <h1 className="mt-2 text-h2 text-ink-900 sm:text-h1">Kế hoạch trồng cây của bạn</h1>
            <p className="mt-3 max-w-3xl text-body text-ink-500 sm:text-body-lg">
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
        <Card className="rounded-lg border-emerald-100/70 bg-white/95 shadow-sm">
          <p className="text-overline text-leaf-700">Kế hoạch đang theo dõi</p>
          <p className="mt-3 font-display text-4xl font-semibold text-ink-900">{activePlans.length}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-500">
            Số vụ trồng đang được theo dõi trong hệ thống.
          </p>
        </Card>
        <Card className="rounded-lg border-emerald-100/70 bg-white/95 shadow-sm">
          <p className="text-overline text-leaf-700">Nhắc việc hôm nay</p>
          <p className="mt-3 font-display text-4xl font-semibold text-ink-900">{reminders.length}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-500">
            Tổng số thông báo cần xem trong ngày.
          </p>
        </Card>
        <Card className="rounded-lg border-emerald-100/70 bg-white/95 shadow-sm">
          <p className="text-overline text-leaf-700">Cần xem lại</p>
          <p className="mt-3 font-display text-4xl font-semibold text-ink-900">
            {plans.filter((plan) => plan.status === "needs_review").length}
          </p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-500">
            Kế hoạch bị ảnh hưởng bởi thời tiết và cần điều chỉnh.
          </p>
        </Card>
      </div>

      {error ? (
        <Card className="rounded-lg border-berry-300/50 bg-berry-300/15 text-body text-berry-500">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg bg-white/70" />
          <Skeleton className="h-48 rounded-lg bg-white/70" />
        </div>
      ) : null}

      {!loading && !plans.length ? (
        <Card className="rounded-lg border-emerald-100/70 bg-white/95 p-10 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
            <Leaf strokeWidth={1.5} className="h-10 w-10" aria-hidden />
          </div>
          <h2 className="mt-5 text-h2 text-ink-900">Chưa có kế hoạch trồng nào</h2>
          <p className="mx-auto mt-3 max-w-md text-body text-ink-500">
            Tạo kế hoạch đầu tiên để theo dõi mùa vụ, nhắc việc và thời tiết cho từng bước chăm cây.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/crop-plans/new" className="no-underline">
              <Button>
                <Sprout strokeWidth={1.75} className="h-4 w-4" aria-hidden />
                Tạo kế hoạch mới
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {!loading && plans.length ? (
        <div className="space-y-4">
          {plans.map((plan) => (
            <CropPlanListCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : null}

      {reminders.length ? (
        <Card className="rounded-lg border-sun-400/45 bg-sun-400/10">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-sun-400/15 p-3 text-sun-300 ring-1 ring-sun-300/30">
              <TriangleAlert strokeWidth={1.75} className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-h3 text-on-dark-strong">Cần làm trong hôm nay</h3>
              <p className="mt-2 text-body leading-relaxed text-muted-on-dark">
                {reminders[0].title}: {reminders[0].body}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
