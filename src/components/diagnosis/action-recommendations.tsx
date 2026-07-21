"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, Stethoscope } from "lucide-react";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ActionPlan } from "@/types";

const riskMeta: Record<string, { label: string; status: StatusBadgeState; icon: typeof CheckCircle2 }> = {
  low: { label: "Theo dõi thông thường", status: "healthy", icon: CheckCircle2 },
  medium: { label: "Cần theo dõi", status: "watch", icon: AlertTriangle },
  high: { label: "Cần xử lý sớm", status: "urgent", icon: ShieldAlert },
  unknown: { label: "Chưa xác định", status: "neutral", icon: AlertTriangle },
};

function ListBlock({ title, items, emphasized = false }: { title: string; items: string[]; emphasized?: boolean }) {
  if (!items.length) return null;
  return (
    <section className={`rounded-lg border p-4 ${emphasized ? "border-leaf/25 bg-surface-soft" : "border-line bg-surface"}`}>
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => <li key={item} className="flex gap-2 text-sm leading-7 text-ink-soft"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />{item}</li>)}
      </ul>
    </section>
  );
}

export function ActionRecommendations({ plan }: { plan?: ActionPlan | null }) {
  if (!plan) return null;
  const meta = riskMeta[plan.risk_level] ?? riskMeta.unknown;

  return (
    <Card variant="raised" padding="lg" className="rounded-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-overline text-leaf-strong">Khuyến nghị hành động</p><h3 className="mt-2 font-display text-[28px] font-bold tracking-[-0.03em] text-ink">Việc nên làm tiếp theo</h3></div>
        <StatusBadge status={meta.status} label={meta.label} />
      </div>

      {plan.warning ? <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm leading-7 text-danger">{plan.warning}</div> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ListBlock title="Việc cần làm ngay" items={plan.immediate_actions ?? []} emphasized />
        <ListBlock title="Theo dõi trong những ngày tới" items={plan.follow_up_actions ?? []} />
        <section className="rounded-lg border border-line bg-surface p-4 text-sm leading-7 text-ink-soft">
          <h4 className="flex items-center gap-2 font-bold text-ink"><Stethoscope className="h-4 w-4 text-leaf-strong" aria-hidden /> Khi nào hỏi chuyên gia</h4>
          <p className="mt-3">{plan.expert_required ? "Nên hỏi chuyên gia nếu dấu hiệu lan nhanh, xuất hiện trên nhiều cây hoặc bạn cần chọn cách xử lý ngoài vườn." : "Chưa bắt buộc hỏi chuyên gia, nhưng nên liên hệ nếu triệu chứng thay đổi hoặc lan rộng."}</p>
          <p className="mt-2">{plan.should_retake_photo ? "Nên chụp lại ảnh rõ hơn trước khi quyết định xử lý." : `Nên kiểm tra lại sau khoảng ${plan.recheck_after_days || 7} ngày.`}</p>
        </section>
        <ListBlock title="Lưu ý an toàn" items={plan.safety_notes ?? []} />
      </div>

      <p className="mt-5 border-t border-line pt-4 text-xs leading-6 text-ink-soft">{plan.disclaimer}</p>
    </Card>
  );
}
