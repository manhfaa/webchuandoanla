import { ExternalLink, ScanLine, ShieldCheck, SlidersHorizontal, TriangleAlert } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

const trustPoints = [
  {
    icon: ScanLine,
    title: "Kiểm tra ảnh đầu vào",
    description: "Ảnh mờ, thiếu vùng lá hoặc có vật che sẽ được nhắc chụp lại trước khi phân tích.",
  },
  {
    icon: SlidersHorizontal,
    title: "Hiển thị mức độ tin cậy",
    description: "Bạn thấy khả năng nào đang được ưu tiên và trường hợp nào cần kiểm tra thêm.",
  },
  {
    icon: ExternalLink,
    title: "Mở lại nguồn tham khảo",
    description: "Nguồn dùng để đối chiếu triệu chứng được giữ lại để bạn tự xem và so sánh.",
  },
];

export function MissionSection() {
  return (
    <SectionShell
      title="Kết quả có cơ sở để bạn kiểm tra tiếp"
      description="Agromind trình bày chất lượng ảnh, mức độ tin cậy và nguồn liên quan thay vì che giấu điều chưa chắc chắn."
      className="bg-surface"
    >
      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <Reveal className="living-veins flex min-h-[390px] flex-col justify-between overflow-hidden rounded-[var(--r-xl)] border border-forest bg-forest p-7 text-on-forest shadow-lg sm:p-9 lg:col-span-5 lg:min-h-full">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] border border-on-forest/20 bg-on-forest/10">
            <ShieldCheck size={23} aria-hidden />
          </span>
          <div className="mt-16">
            <h3 className="max-w-md font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-4xl">
              Hiểu vì sao hệ thống đưa ra gợi ý.
            </h3>
            <p className="mt-4 max-w-md text-sm font-medium leading-7 text-on-forest-muted sm:text-base">
              Một kết quả rõ ràng giúp bạn quan sát cây kỹ hơn trước khi quyết định cách xử lý.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {trustPoints.map((point, index) => {
            const Icon = point.icon;
            const isWide = index === trustPoints.length - 1;

            return (
              <Reveal key={point.title} delay={index * 0.06} className={cn("h-full", isWide && "sm:col-span-2")}>
                <article
                  className={cn(
                    "group flex h-full min-h-[220px] flex-col rounded-[var(--r-xl)] border p-6 shadow-sm transition duration-260 hover:-translate-y-1 hover:border-leaf/40 hover:shadow-md sm:p-7",
                    index === 1 ? "border-line-strong bg-surface-soft" : "border-line bg-surface-raised",
                    isWide && "sm:min-h-[190px] sm:flex-row sm:items-center sm:gap-6",
                  )}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-line-strong bg-surface text-leaf-strong shadow-sm transition duration-260 group-hover:border-leaf/45 group-hover:bg-surface-soft">
                    <Icon size={22} aria-hidden />
                  </span>
                  <div className={cn("mt-auto pt-8", isWide && "sm:mt-0 sm:pt-0")}>
                    <h3 className="font-display text-xl font-extrabold tracking-[-0.025em] text-ink sm:text-2xl">{point.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-ink-soft">{point.description}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Reveal delay={0.15} className="mt-5 grid gap-4 rounded-[var(--r-lg)] border border-sun/35 bg-sun-soft px-5 py-5 sm:grid-cols-[44px_minmax(0,1fr)] sm:items-start sm:px-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] bg-surface text-sun-strong shadow-sm">
          <TriangleAlert size={20} aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-ink">Lưu ý khi sử dụng kết quả</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Kết quả AI mang tính tham khảo. Nếu cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi chuyên gia nông nghiệp tại địa phương.
          </p>
        </div>
      </Reveal>
    </SectionShell>
  );
}
