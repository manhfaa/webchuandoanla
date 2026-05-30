"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, Stethoscope } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { ActionPlan } from "@/types";

const riskMeta: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  low: {
    label: "Rủi ro thấp",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
  },
  medium: {
    label: "Cần theo dõi",
    className: "border-amber-200 bg-amber-50 text-amber-950",
    icon: AlertTriangle,
  },
  high: {
    label: "Rủi ro cao",
    className: "border-red-200 bg-red-50 text-red-950",
    icon: ShieldAlert,
  },
  unknown: {
    label: "Chưa xác định",
    className: "border-slate-200 bg-slate-50 text-slate-900",
    icon: AlertTriangle,
  },
};

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-50/75">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ActionRecommendations({ plan }: { plan?: ActionPlan | null }) {
  if (!plan) return null;
  const meta = riskMeta[plan.risk_level] ?? riskMeta.unknown;
  const Icon = meta.icon;

  return (
    <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
            Khuyến nghị hành động
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold">Việc nên làm sau chẩn đoán</h3>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${meta.className}`}>
          <Icon className="h-4 w-4" />
          {meta.label}
        </div>
      </div>

      {plan.warning ? (
        <div className="mt-5 rounded-[22px] border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm leading-7 text-red-50">
          {plan.warning}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ListBlock title="Việc cần làm ngay" items={plan.immediate_actions ?? []} />
        <ListBlock title="Theo dõi trong 3-7 ngày" items={plan.follow_up_actions ?? []} />
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-emerald-50/75">
          <p className="flex items-center gap-2 font-semibold text-white">
            <Stethoscope className="h-4 w-4 text-lime-200" />
            Khi nào hỏi chuyên gia
          </p>
          <p className="mt-3">
            {plan.expert_required
              ? "Nên hỏi chuyên gia nếu vết bệnh lan nhanh, xuất hiện trên nhiều cây hoặc bạn cần chọn hướng xử lý ngoài vườn."
              : "Chưa bắt buộc hỏi chuyên gia, nhưng nên liên hệ nếu triệu chứng thay đổi hoặc lan rộng."}
          </p>
          <p className="mt-2">
            {plan.should_retake_photo
              ? "Nên chụp lại ảnh rõ hơn trước khi quyết định xử lý."
              : `Nên kiểm tra lại sau khoảng ${plan.recheck_after_days || 7} ngày.`}
          </p>
        </div>
        <ListBlock title="Lưu ý an toàn" items={plan.safety_notes ?? []} />
      </div>

      <p className="mt-5 text-xs leading-6 text-emerald-50/55">{plan.disclaimer}</p>
    </Card>
  );
}
