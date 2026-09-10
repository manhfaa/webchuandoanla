"use client";

import { TriangleAlert } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

const trustPoints = [
  {
    title: "Kiểm tra ảnh đầu vào",
    titleEn: "Input image check",
    description: "Ảnh mờ, thiếu vùng lá hoặc có vật che sẽ được nhắc chụp lại trước khi phân tích.",
    descriptionEn: "Blurry photos, missing leaf area or obstructions prompt a retake before analysis.",
  },
  {
    title: "Hiển thị mức độ tin cậy",
    titleEn: "Confidence shown",
    description: "Bạn thấy khả năng nào đang được ưu tiên và trường hợp nào cần kiểm tra thêm.",
    descriptionEn: "You see which possibility is prioritized and which cases need further checking.",
  },
  {
    title: "Mở lại nguồn tham khảo",
    titleEn: "Reopen reference sources",
    description: "Nguồn dùng để đối chiếu triệu chứng được giữ lại để bạn tự xem và so sánh.",
    descriptionEn: "The sources used to cross-check symptoms are kept so you can view and compare them.",
  },
];

/**
 * Three clauses in a ruled row, numbered like sub-sections of the manual, then
 * one dark statement panel and the advisory note as a margin rule. No icon
 * chips: a shield glyph beside "trustworthy" is exactly the pattern that makes
 * a page look assembled from a kit.
 */
export function MissionSection() {
  const tr = useTr();

  return (
    <SectionShell
      number="05"
      eyebrow={tr("Cách trình bày kết quả", "How results are presented")}
      title={tr("Kết quả có cơ sở để bạn kiểm tra tiếp", "Grounded results for you to check further")}
      description={tr("Agromind trình bày chất lượng ảnh, mức độ tin cậy và nguồn liên quan thay vì che giấu điều chưa chắc chắn.", "Agromind shows image quality, confidence and related sources instead of hiding what is uncertain.")}
      className="bg-canvas"
    >
      <div className="grid border-t border-line md:grid-cols-3">
        {trustPoints.map((point, index) => (
          <Reveal
            key={point.title}
            delay={index * 0.06}
            className={cn("border-b border-line py-8 md:border-b-0 md:pr-8", index > 0 && "md:border-l md:pl-8")}
          >
            <p className="font-display text-xs font-bold tabular-nums tracking-[0.14em] text-leaf-strong">5.{index + 1}</p>
            <h3 className="mt-5 font-display text-xl font-extrabold tracking-[-0.025em] text-ink sm:text-2xl">{tr(point.title, point.titleEn)}</h3>
            <p className="mt-3 max-w-[38ch] text-sm leading-7 text-ink-soft">{tr(point.description, point.descriptionEn)}</p>
          </Reveal>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <Reveal className="paper-grain corner-marks relative flex flex-col justify-between border border-forest bg-forest p-7 text-on-forest dark:border-line dark:bg-[color-mix(in_srgb,var(--leaf)_10%,var(--surface-raised))] sm:p-9 lg:col-span-7">
          <p className="kicker relative text-on-forest-muted">{tr("Nguyên tắc", "Principle")}</p>
          <div className="relative mt-14">
            <h3 className="max-w-xl font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-[34px] text-balance">
              {tr("Hiểu vì sao hệ thống đưa ra gợi ý.", "Understand why the system makes a suggestion.")}
            </h3>
            <p className="mt-4 max-w-lg text-sm leading-7 text-on-forest-muted sm:text-base">
              {tr("Một kết quả rõ ràng giúp bạn quan sát cây kỹ hơn trước khi quyết định cách xử lý.", "A clear result helps you observe the plant more closely before deciding how to treat it.")}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col justify-center border-l-2 border-sun bg-sun-soft px-6 py-7 lg:col-span-5">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <TriangleAlert size={18} className="shrink-0 text-warning-ink" aria-hidden />
            {tr("Lưu ý khi sử dụng kết quả", "Note on using the results")}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {tr("Kết quả AI mang tính tham khảo. Nếu cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi chuyên gia nông nghiệp tại địa phương.", "AI results are for reference. If disease spreads quickly or pesticides are needed, consult a local agriculture expert.")}
          </p>
        </Reveal>
      </div>
    </SectionShell>
  );
}
