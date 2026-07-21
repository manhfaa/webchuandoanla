import { Camera, CheckCircle2, ClipboardCheck, ScanSearch } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

const stages = [
  {
    step: "01",
    title: "Chụp lá",
    description: "Tải ảnh có sẵn hoặc chụp trực tiếp. Hướng dẫn trên màn hình giúp bạn lấy được ảnh đủ sáng và rõ vùng lá.",
    detail: "Kiểm tra vùng lá bằng YOLO",
    icon: Camera,
  },
  {
    step: "02",
    title: "Phân tích ảnh",
    description: "Hệ thống gợi ý những khả năng cần chú ý và hiển thị độ tin cậy để bạn không phải dựa vào một nhãn duy nhất.",
    detail: "Gợi ý các khả năng bằng CNN",
    icon: ScanSearch,
  },
  {
    step: "03",
    title: "Đối chiếu triệu chứng",
    description: "Bạn có thể bổ sung điều quan sát được. Hệ thống tìm nguồn tham khảo để kiểm tra mức độ phù hợp của mô tả.",
    detail: "Tìm và tổng hợp nguồn tham khảo",
    icon: ClipboardCheck,
  },
  {
    step: "04",
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
      <div className="pointer-events-none absolute left-[8%] right-[8%] top-[46%] hidden h-px bg-line lg:block" aria-hidden />
      <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <Reveal key={stage.step} delay={index * 0.055}>
              <SurfaceCard variant={index === 1 ? "soft" : "default"} padding="lg" className="group h-full border-line bg-surface-raised">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest text-on-forest shadow-sm transition duration-180 group-hover:-translate-y-1">
                    <Icon size={21} aria-hidden />
                  </span>
                  <span className="font-display text-3xl font-extrabold text-line">{stage.step}</span>
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-ink">{stage.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{stage.description}</p>
                <div className="mt-5 border-t border-line pt-4 text-xs font-semibold text-leaf-strong">{stage.detail}</div>
              </SurfaceCard>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
