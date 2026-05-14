import { CalendarClock, CircleAlert, ListTodo, Sprout } from "lucide-react";

import type { CropPlan, CropPlanStepStatus, ReminderItem } from "@/types";
import { Card } from "@/components/ui/card";

const statusLabels: Record<CropPlanStepStatus, string> = {
  pending: "Sap toi",
  current: "Dang lam",
  completed: "Da xong",
  skipped: "Bo qua",
  delayed: "Bi doi lich",
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
      label: "Tien do tong",
      value: `${progress}%`,
      note: `${completed}/${plan.steps.length} buoc da hoan thanh`,
      icon: Sprout,
    },
    {
      label: "Buoc hien tai",
      value: current ? `${current.step_number}. ${current.short_label || current.title}` : "Chua co",
      note: current ? statusLabels[current.status] : "Dang cho tao ke hoach",
      icon: ListTodo,
    },
    {
      label: "Nhac viec lien quan",
      value: `${todayCount}`,
      note: "Thong bao dang cho xu ly",
      icon: CalendarClock,
    },
    {
      label: "Can xem lai",
      value: `${delayed}`,
      note: delayed ? "Co buoc dang bi doi lich" : "Chua co buoc bi doi",
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

