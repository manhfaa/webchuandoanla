import { Camera, CheckCircle2, ClipboardCheck, ScanSearch } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

const stages = [
  {
    step: "01",
    question: "Ảnh có đủ rõ không?",
    title: "Chụp lá",
    description: "Tải ảnh có sẵn hoặc chụp trực tiếp. Hướng dẫn trên màn hình giúp bạn lấy được ảnh đủ sáng và rõ vùng lá.",
    detail: "Kiểm tra vùng lá bằng YOLO",
    icon: Camera,
  },
  {
    step: "02",
    question: "Lá có dấu hiệu gì?",
    title: "Phân tích ảnh",
    description: "Hệ thống gợi ý những khả năng cần chú ý và hiển thị độ tin cậy để bạn không phải dựa vào một nhãn duy nhất.",
    detail: "Gợi ý các khả năng bằng CNN",
    icon: ScanSearch,
  },
  {
    step: "03",
    question: "Mô tả có phù hợp?",
    title: "Đối chiếu triệu chứng",
    description: "Bạn có thể bổ sung điều quan sát được. Hệ thống tìm nguồn tham khảo để kiểm tra mức độ phù hợp của mô tả.",
    detail: "Tìm và tổng hợp nguồn tham khảo",
    icon: ClipboardCheck,
  },
  {
    step: "04",
    question: "Cần làm gì tiếp?",
    title: "Theo dõi việc cần làm",
    description: "Kết quả, nguồn và khuyến nghị được lưu lại để bạn chụp lại, so sánh và theo dõi cây theo thời gian.",
    detail: "Lưu lịch sử theo tài khoản",
    icon: CheckCircle2,
  },
];

export function WorkflowSection() {
  return (
    <SectionShell
      id="quy-trinh"
      eyebrow="Cách Agromind hỗ trợ bạn"
      title="Một hành trình rõ ràng từ ảnh lá đến việc cần làm"
      description="Mỗi bước đều trả lời một câu hỏi cụ thể: ảnh có dùng được không, lá có dấu hiệu gì, triệu chứng có phù hợp không và bạn nên theo dõi tiếp ra sao."
      className="relative overflow-hidden bg-surface"
    >
      <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <Reveal key={stage.step} delay={index * 0.055}>
              <SurfaceCard
                variant="raised"
                padding="none"
                className="group relative h-full overflow-hidden rounded-xl border-line bg-surface-raised hover:-translate-y-1 hover:border-leaf/35 hover:shadow-lg"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-leaf" aria-hidden />
                <div className="flex h-full flex-col p-6 pt-7">
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex h-12 min-w-14 items-center justify-center rounded-xl bg-leaf px-3 font-display text-xl font-extrabold tabular-nums text-on-leaf shadow-sm">
                      {stage.step}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-soft text-leaf-strong transition duration-180 group-hover:rotate-3 group-hover:scale-105">
                      <Icon size={20} aria-hidden />
                    </span>
                  </div>

                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.12em] text-leaf-strong">{stage.question}</p>
                  <h3 className="mt-2 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">{stage.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-ink-soft">{stage.description}</p>

                  <div className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-xs font-semibold leading-6 text-ink">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                    <span>{stage.detail}</span>
                  </div>
                </div>
              </SurfaceCard>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
