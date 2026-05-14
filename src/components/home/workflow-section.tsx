import { CheckCircle2, ChevronRight } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { workflowSteps } from "@/data/mock/workflow";

export function WorkflowSection() {
  return (
    <SectionShell
      id="quy-trinh"
      eyebrow="Quy trình hoạt động"
      title="Luồng 5 bước giúp người dùng hiểu ngay hệ thống đang làm gì và vì sao nên tin kết quả xác thực."
      description="Thiết kế step cards hiện đại, chia tách rõ bước tải ảnh, YOLO xác thực lá, lưu lịch sử, tư vấn Light RAG và roadmap CNN."
    >
      <div className="grid gap-5 lg:grid-cols-5">
        {workflowSteps.map((step, index) => (
          <Reveal key={step.id} delay={index * 0.05}>
            <Card className="relative h-full rounded-[30px] border-white/75 bg-white/90 p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                {index < workflowSteps.length - 1 ? (
                  <ChevronRight className="text-brand-300" />
                ) : (
                  <CheckCircle2 className="text-lime-500" />
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                {step.step}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
