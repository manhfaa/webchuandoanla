import { ExternalLink, ScanLine, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

const trustPoints = [
  {
    icon: ScanLine,
    title: "Kiểm tra ảnh đầu vào",
    description: "Ảnh mờ, thiếu vùng lá hoặc không phù hợp sẽ được nhắc chụp lại trước khi phân tích tiếp.",
  },
  {
    icon: SlidersHorizontal,
    title: "Hiển thị mức độ tin cậy",
    description: "Bạn luôn thấy kết quả nào đang được ưu tiên và trường hợp nào nên kiểm tra thêm.",
  },
  {
    icon: ExternalLink,
    title: "Nguồn tham khảo mở được",
    description: "Khi nhập triệu chứng, các nguồn dùng để đối chiếu được hiển thị để bạn tự xem lại.",
  },
];

export function MissionSection() {
  return (
    <SectionShell
      eyebrow="Tin cậy và an toàn"
      title="Kết quả có cơ sở để bạn kiểm tra tiếp"
      description="Agromind không che giấu mức độ chắc chắn. Mỗi kết quả được trình bày cùng trạng thái ảnh, độ tin cậy và nguồn liên quan khi có."
      className="bg-surface"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {trustPoints.map((point, index) => {
          const Icon = point.icon;
          return (
            <Reveal key={point.title} delay={index * 0.055}>
              <SurfaceCard variant="raised" padding="lg" className="h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">{point.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{point.description}</p>
              </SurfaceCard>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.16} className="mt-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-sun/35 bg-sun/10 p-5 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun/20 text-soil">
            <ShieldCheck size={21} aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-ink">Lưu ý khi sử dụng kết quả</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">Kết quả AI mang tính tham khảo. Nếu cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi chuyên gia nông nghiệp tại địa phương.</p>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
