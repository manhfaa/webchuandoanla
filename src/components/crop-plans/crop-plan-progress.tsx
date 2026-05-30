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
  const todayCount = reminders.filter((item) => item.deep_link.includes(`/crop-plans/${plan.id}`)).length;

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
      value: `${todayCount}`,
      note: "Thông báo đang chờ xử lý",
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
            className="rounded-[28px] border-emerald-100/70 bg-gradient-to-br from-white via-white to-emerald-50/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/65">
                  {metric.label}
                </p>
                <p className="mt-4 font-display text-3xl font-semibold text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{metric.note}</p>
              </div>
              <span className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                <Icon size={18} />
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
