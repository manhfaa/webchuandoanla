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
      title="Từ ảnh lá đến khuyến nghị chăm sóc: mọi bước đều được trình bày rõ ràng để người dùng dễ kiểm tra."
      description="Agromind AI không đưa ra kết luận một chiều. Ảnh lá được kiểm tra, phân tích, đối chiếu thêm với triệu chứng và nguồn tham khảo trước khi lưu lại kết quả."
      className="bg-gradient-to-b from-white via-emerald-50/50 to-white dark:from-[#04180f] dark:via-[#08281a] dark:to-[#04180f]"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {workflowSteps.map((step, index) => {
          const Icon = workflowIcons[step.id as keyof typeof workflowIcons] ?? CheckCircle2;
          return (
            <Reveal key={step.id} delay={index * 0.045}>
              <Card className="group relative h-full overflow-hidden rounded-[30px] border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(17,64,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-float dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
                <div className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-r from-leaf-500 via-lime-300 to-sun-400" />
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf-50 text-leaf-700 ring-1 ring-leaf-100 transition group-hover:bg-leaf-600 group-hover:text-white dark:bg-white/10 dark:text-lime-100 dark:ring-white/10">
                    <Icon size={21} />
                  </span>
                  {index < workflowSteps.length - 1 ? (
                    <ChevronRight className="hidden text-leaf-300 xl:block" size={18} />
                  ) : (
                    <CheckCircle2 className="text-lime-500" size={18} />
                  )}
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-leaf-700 dark:text-lime-100">
                  {step.step}
                </p>
                <h3 className="mt-3 font-display text-xl font-semibold leading-tight text-ink-900 dark:text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-emerald-50/75">{step.description}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
