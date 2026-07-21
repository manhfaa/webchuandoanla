import { Check, ExternalLink, ScanLine, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

const trustPoints = [
  {
    step: "01",
    icon: ScanLine,
    title: "Kiểm tra ảnh đầu vào",
    description: "Ảnh mờ, thiếu vùng lá hoặc không phù hợp sẽ được nhắc chụp lại trước khi phân tích tiếp.",
  },
  {
    step: "02",
    icon: SlidersHorizontal,
    title: "Hiển thị mức độ tin cậy",
    description: "Bạn luôn thấy kết quả nào đang được ưu tiên và trường hợp nào nên kiểm tra thêm.",
  },
  {
    step: "03",
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
      <Reveal>
        <SurfaceCard variant="raised" padding="none" className="overflow-hidden rounded-xl">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="field-contours flex min-h-[360px] flex-col justify-between bg-forest p-7 text-on-forest sm:p-8">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-on-forest/15 bg-on-forest/10 text-on-forest">
                  <ShieldCheck size={23} aria-hidden />
                </span>
                <p className="mt-7 text-overline text-on-forest-muted">Minh bạch trong từng kết quả</p>
                <h3 className="mt-3 max-w-md font-display text-3xl font-bold leading-tight tracking-[-0.035em] text-on-forest">
                  Hiểu vì sao hệ thống đưa ra gợi ý
                </h3>
                <p className="mt-4 max-w-md text-sm font-medium leading-7 text-on-forest-muted">
                  Không chỉ xem tên bệnh, bạn còn biết chất lượng ảnh, mức tin cậy và cơ sở để tự kiểm tra lại.
                </p>
              </div>
              <div className="mt-8 flex items-end gap-4 border-t border-on-forest/15 pt-6">
                <span className="font-display text-6xl font-extrabold leading-none tabular-nums text-on-forest">03</span>
                <span className="max-w-32 pb-1 text-xs font-semibold uppercase leading-5 tracking-[0.12em] text-on-forest-muted">lớp thông tin rõ ràng</span>
              </div>
            </div>

            <div className="divide-y divide-line bg-surface-raised">
              {trustPoints.map((point, index) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="group grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-3 p-5 transition duration-180 hover:bg-surface-soft sm:items-center sm:gap-5 sm:p-7">
                    <span className="font-display text-2xl font-extrabold tabular-nums text-leaf-strong">{point.step}</span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-soft text-leaf-strong transition duration-180 group-hover:border-leaf/30 group-hover:bg-surface">
                      <Icon size={21} aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-ink">{point.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-ink-soft">{point.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>
      </Reveal>

      <Reveal delay={0.16} className="mt-5">
        <div className="flex flex-col gap-4 rounded-xl border border-sun/35 bg-sun/10 p-5 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun/20 text-soil">
            <ShieldCheck size={21} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Lưu ý khi sử dụng kết quả</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">Kết quả AI mang tính tham khảo. Nếu cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi chuyên gia nông nghiệp tại địa phương.</p>
          </div>
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sun/35 text-soil sm:flex">
            <Check size={17} aria-hidden />
          </span>
        </div>
      </Reveal>
    </SectionShell>
  );
}
