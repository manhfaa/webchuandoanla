import {
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSearch,
  ListChecks,
  Microscope,
  ScanLine,
} from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { workflowSteps } from "@/data/mock/workflow";

const workflowIcons = {
  upload: Camera,
  yolo: ScanLine,
  cnn: Microscope,
  symptoms: ListChecks,
  tavily: FileSearch,
  deepseek: BrainCircuit,
  history: Database,
};

export function WorkflowSection() {
  return (
    <SectionShell
      id="quy-trinh"
      eyebrow="Quy trình AI của Agromind"
      title="Từ ảnh lá đến khuyến nghị: toàn bộ pipeline được hiển thị rõ để người dùng biết AI đang làm gì."
      description="Agromind AI không chỉ trả một nhãn bệnh. Hệ thống xác thực ảnh, dự đoán top 5, đối chiếu triệu chứng với nguồn web và lưu lại kết quả để theo dõi."
      className="bg-gradient-to-b from-white via-emerald-50/50 to-white"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {workflowSteps.map((step, index) => {
          const Icon = workflowIcons[step.id as keyof typeof workflowIcons] ?? CheckCircle2;
          return (
            <Reveal key={step.id} delay={index * 0.045}>
              <Card className="group relative h-full overflow-hidden rounded-[30px] border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(17,64,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-float">
                <div className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-r from-leaf-500 via-lime-300 to-sun-400" />
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf-50 text-leaf-700 ring-1 ring-leaf-100 transition group-hover:bg-leaf-600 group-hover:text-white">
                    <Icon size={21} />
                  </span>
                  {index < workflowSteps.length - 1 ? (
                    <ChevronRight className="hidden text-leaf-300 xl:block" size={18} />
                  ) : (
                    <CheckCircle2 className="text-lime-500" size={18} />
                  )}
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-leaf-700">
                  {step.step}
                </p>
                <h3 className="mt-3 font-display text-xl font-semibold leading-tight text-ink-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
