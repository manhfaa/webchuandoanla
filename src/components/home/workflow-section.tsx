import Image from "next/image";
import { Camera, CheckCircle2, ClipboardCheck, ScanSearch } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

const stages = [
  {
    title: "Chụp lá",
    question: "Ảnh có đủ rõ không?",
    description: "Chụp một chiếc lá chính, đủ sáng và không bị vật khác che khuất.",
    detail: "Ảnh được kiểm tra trước khi phân tích.",
    icon: Camera,
  },
  {
    title: "Phân tích",
    question: "Lá đang có dấu hiệu gì?",
    description: "Các khả năng được xếp hạng cùng độ tin cậy thay vì chỉ đưa ra một nhãn.",
    detail: "Năm khả năng nổi bật được trình bày rõ.",
    icon: ScanSearch,
  },
  {
    title: "Đối chiếu",
    question: "Triệu chứng có phù hợp không?",
    description: "Mô tả thực tế của bạn được so sánh với nguồn tham khảo có thể mở lại.",
    detail: "Bạn luôn biết nguồn thông tin đến từ đâu.",
    icon: ClipboardCheck,
  },
  {
    title: "Theo dõi",
    question: "Việc nào cần làm tiếp?",
    description: "Kết quả và khuyến nghị được lưu để bạn chụp lại và so sánh theo thời gian.",
    detail: "Mỗi lần kiểm tra trở thành một mốc chăm sóc.",
    icon: CheckCircle2,
  },
];

export function WorkflowSection() {
  return (
    <section id="quy-trinh" className="section-grid relative overflow-hidden bg-canvas px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-[22px] bg-forest text-on-forest shadow-lg">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src="/plant-leaves/story-grape-leaf.png"
                alt="Lá nho có phấn trắng và đốm nâu trên giàn"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/10 to-transparent" aria-hidden />
            </div>
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-4xl">
                Một đường sinh mạch từ ảnh lá đến hành động.
              </h2>
              <p className="mt-4 max-w-[48ch] text-sm font-medium leading-7 text-on-forest-muted sm:text-base">
                Mỗi giai đoạn trả lời đúng một câu hỏi để kết quả dễ hiểu và có thể theo dõi ngoài vườn.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="relative pl-4 sm:pl-8">
          <div className="absolute bottom-10 left-[25px] top-10 w-px bg-gradient-to-b from-leaf/15 via-leaf to-leaf/15 sm:left-[41px]" aria-hidden />
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <Reveal key={stage.title} delay={index * 0.07}>
                <article className="group relative grid gap-4 border-b border-line py-8 first:pt-2 last:border-b-0 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-6">
                  <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-surface-raised text-leaf-strong shadow-sm transition duration-180 group-hover:-translate-y-0.5 group-hover:border-leaf/45 group-hover:bg-surface-soft sm:h-16 sm:w-16">
                    <Icon size={22} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-leaf-strong">{stage.question}</p>
                    <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl">{stage.title}</h3>
                    <p className="mt-3 max-w-[54ch] text-sm leading-7 text-ink-soft sm:text-base">{stage.description}</p>
                    <p className="mt-4 border-l-2 border-leaf/45 pl-3 text-xs font-semibold leading-5 text-ink">{stage.detail}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
