import { CalendarClock, CircleAlert, ListTodo, Sprout } from "lucide-react";

import type { CropPlan, CropPlanStepStatus, ReminderItem } from "@/types";
import { Card } from "@/components/ui/card";

const statusLabels: Record<CropPlanStepStatus, string> = {
  pending: "Sắp tới",
  current: "Đang làm",
  completed: "Đã xong",
  skipped: "Bỏ qua",
  delayed: "Bị đổi lịch",
};

export function CropPlanProgress({
  plan,
  reminders,
}: {
  plan: CropPlan;
  reminders: ReminderItem[];
}) {
  const completed = plan.steps.filter((step) => step.status === "completed").length;
  const current = plan.steps.find((step) => step.status === "current") ?? plan.steps[0];
  const delayed = plan.steps.filter((step) => step.status === "delayed").length;
  const progress = plan.steps.length ? Math.round((completed / plan.steps.length) * 100) : 0;
  const scheduledReminderCount = reminders.filter((item) =>
    item.deep_link.includes(`/crop-plans/${plan.id}`),
  ).length;

  const metrics = [
    {
      label: "Tiến độ tổng",
      value: `${progress}%`,
      note: `${completed}/${plan.steps.length} bước đã hoàn thành`,
      icon: Sprout,
    },
    {
      label: "Bước hiện tại",
      value: current ? `${current.step_number}. ${current.short_label || current.title}` : "Chưa có",
      note: current ? statusLabels[current.status] : "Đang chờ tạo kế hoạch",
      icon: ListTodo,
    },
    {
      label: "Nhắc việc liên quan",
      value: `${scheduledReminderCount}`,
      note: "Nhắc việc cho toàn bộ vụ trồng",
      icon: CalendarClock,
    },
    {
      label: "Cần xem lại",
      value: `${delayed}`,
      note: delayed ? "Có bước đang bị đổi lịch" : "Chưa có bước bị đổi",
      icon: CircleAlert,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            variant={metric.label === "Tiến độ tổng" ? "dark" : metric.label === "Cần xem lại" && delayed ? "warning" : "default"}
            className="rounded-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={metric.label === "Tiến độ tổng" ? "text-overline text-on-forest-muted" : "text-overline text-leaf-strong"}>
                  {metric.label}
                </p>
                <p className={metric.label === "Tiến độ tổng" ? "mt-4 font-display text-3xl font-bold text-on-forest" : "mt-4 font-display text-3xl font-bold text-ink"}>
                  {metric.value}
                </p>
                <p className={metric.label === "Tiến độ tổng" ? "mt-3 text-sm leading-6 text-on-forest-muted" : "mt-3 text-sm leading-6 text-ink-soft"}>{metric.note}</p>
              </div>
              <span className={metric.label === "Tiến độ tổng" ? "rounded-md bg-on-forest/10 p-3 text-on-forest" : "rounded-md bg-surface-soft p-3 text-leaf-strong"}>
                <Icon size={18} />
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
