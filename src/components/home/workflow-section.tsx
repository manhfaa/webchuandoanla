import { ArrowRight, Camera, CheckCircle2, ClipboardCheck, ScanSearch } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

const stages = [
  {
    step: "01",
    question: "Ảnh có đủ rõ không?",
    title: "Chụp lá",
    description: "Tải ảnh có sẵn hoặc chụp trực tiếp. Hướng dẫn trên màn hình giúp bạn lấy ảnh đủ sáng và rõ vùng lá.",
    detail: "Kiểm tra vùng lá trước khi phân tích",
    icon: Camera,
  },
  {
    step: "02",
    question: "Lá có dấu hiệu gì?",
    title: "Phân tích ảnh",
    description: "Hệ thống xếp hạng những khả năng cần chú ý và hiển thị độ tin cậy thay vì chỉ đưa ra một nhãn duy nhất.",
    detail: "Hiển thị 5 khả năng được ưu tiên",
    icon: ScanSearch,
  },
  {
    step: "03",
    question: "Mô tả có phù hợp?",
    title: "Đối chiếu triệu chứng",
    description: "Bổ sung điều bạn quan sát được để hệ thống tìm nguồn liên quan và kiểm tra mức độ phù hợp của mô tả.",
    detail: "Nguồn tham khảo có thể mở lại",
    icon: ClipboardCheck,
  },
  {
    step: "04",
    question: "Cần làm gì tiếp?",
    title: "Theo dõi và hành động",
    description: "Kết quả và khuyến nghị được lưu lại để bạn chụp lại, so sánh và theo dõi cây theo thời gian.",
    detail: "Lưu lịch sử theo tài khoản",
    icon: CheckCircle2,
  },
];

const nodeStyles = [
  "bg-on-forest text-forest",
  "bg-info text-on-forest",
  "bg-sun text-forest",
  "bg-on-forest text-forest",
];

export function WorkflowSection() {
  return (
    <SectionShell
      id="quy-trinh"
      eyebrow="Cách Agromind hỗ trợ bạn"
      title="Từ một ảnh lá đến việc cần làm, trong bốn bước rõ ràng"
      description="Mỗi giai đoạn trả lời một câu hỏi thực tế để bạn hiểu kết quả và biết nên theo dõi cây như thế nào."
      className="relative overflow-hidden bg-surface"
    >
      <Reveal>
        <div className="field-contours relative overflow-hidden rounded-2xl bg-forest p-5 shadow-lg sm:p-7 lg:p-8">
          <div className="mb-7 flex flex-col gap-3 border-b border-on-forest/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-on-forest-muted">Luồng kiểm tra Agromind</p>
              <p className="mt-2 max-w-2xl font-display text-xl font-bold tracking-[-0.02em] text-on-forest sm:text-2xl">
                Tập trung vào điều cần quan sát và việc nên làm ở từng bước.
              </p>
            </div>
            <span className="w-fit rounded-full border border-on-forest/15 bg-on-forest/10 px-3 py-1.5 text-xs font-semibold text-on-forest-muted">
              4 giai đoạn dễ theo dõi
            </span>
          </div>

          <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-on-forest/20 lg:block" aria-hidden />

            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <Reveal key={stage.step} delay={index * 0.055} className="relative min-w-0">
                  <article className="group relative flex h-full min-w-0 flex-col rounded-xl border border-on-forest/15 bg-on-forest/[0.065] p-5 backdrop-blur-sm transition duration-180 hover:-translate-y-1 hover:border-mint/45 hover:bg-on-forest/10">
                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <span className={cn("flex h-14 min-w-14 items-center justify-center rounded-xl font-display text-xl font-extrabold tabular-nums shadow-sm", nodeStyles[index])}>
                        {stage.step}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-on-forest/15 bg-forest/70 text-on-forest transition duration-180 group-hover:rotate-3 group-hover:scale-105">
                        <Icon size={20} aria-hidden />
                      </span>
                    </div>

                    <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.12em] text-on-forest-muted">{stage.question}</p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-[-0.025em] text-on-forest">{stage.title}</h3>
                    <p className="mt-3 flex-1 text-sm font-medium leading-7 text-on-forest-muted">{stage.description}</p>

                    <div className="mt-5 flex items-start gap-2 border-t border-on-forest/15 pt-4 text-xs font-semibold leading-5 text-on-forest">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-on-forest-muted" aria-hidden />
                      <span>{stage.detail}</span>
                    </div>

                    {index < stages.length - 1 ? (
                      <span className="absolute -right-3 top-6 z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-on-forest/15 bg-forest text-on-forest-muted lg:flex" aria-hidden>
                        <ArrowRight size={14} />
                      </span>
                    ) : null}
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
