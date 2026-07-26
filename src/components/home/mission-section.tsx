"use client";

import { ExternalLink, TriangleAlert } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import {
  HairlineRegister,
  MarginNote,
  NotebookSection,
  PaperStack,
  SpecimenLabel,
} from "@/components/ui/field-notebook";
import { useTr } from "@/lib/use-tr";

/* V2 — SECTION TIN CẬY
   Trước: 1 khối forest + 3 card giống nhau, mỗi card mở đầu bằng icon chip.
   Sau  : layout editorial 4/8 — trái là 3 nguyên tắc trên dòng kẻ (số hiệu mono),
          phải là phiếu kết quả minh họa + chip nguồn tham khảo, có ghi chú lề.
   Nội dung 3 nguyên tắc và ghi chú an toàn giữ nguyên từng chữ. */

const trustPoints = [
  {
    title: "Kiểm tra ảnh đầu vào",
    titleEn: "Input image check",
    description:
      "Ảnh mờ, thiếu vùng lá hoặc có vật che sẽ được nhắc chụp lại trước khi phân tích.",
    descriptionEn:
      "Blurry photos, missing leaf area or obstructions prompt a retake before analysis.",
  },
  {
    title: "Hiển thị mức độ tin cậy",
    titleEn: "Confidence shown",
    description:
      "Bạn thấy khả năng nào đang được ưu tiên và trường hợp nào cần kiểm tra thêm.",
    descriptionEn:
      "You see which possibility is prioritized and which cases need further checking.",
  },
  {
    title: "Mở lại nguồn tham khảo",
    titleEn: "Reopen reference sources",
    description:
      "Nguồn dùng để đối chiếu triệu chứng được giữ lại để bạn tự xem và so sánh.",
    descriptionEn:
      "The sources used to cross-check symptoms are kept so you can view and compare them.",
  },
];

/* Các khả năng phụ trong phiếu minh họa. Phiếu được gắn nhãn "ví dụ minh họa"
   để không bị hiểu là số liệu thật của người dùng. */
const secondaryChances = [
  { label: "Cháy lá sớm", labelEn: "Early blight", value: 14 },
  { label: "Thiếu dinh dưỡng", labelEn: "Nutrient deficiency", value: 9 },
];

export function MissionSection() {
  const tr = useTr();

  return (
    <NotebookSection
      tab={tr("Vì sao đáng tin", "Why it is trustworthy")}
      title={tr(
        "Kết quả có cơ sở để bạn kiểm tra tiếp",
        "Grounded results for you to check further",
      )}
      description={tr(
        "Agromind trình bày chất lượng ảnh, mức độ tin cậy và nguồn liên quan thay vì che giấu điều chưa chắc chắn.",
        "Agromind shows image quality, confidence and related sources instead of hiding what is uncertain.",
      )}
      className="bg-surface"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-16">
        {/* ── Trái: 3 nguyên tắc trên dòng kẻ ── */}
        <div>
          <div className="border-b border-paper-rule">
            {trustPoints.map((point, index) => (
              <Reveal key={point.title} delay={index * 0.06}>
                <HairlineRegister
                  index={index + 1}
                  title={tr(point.title, point.titleEn)}
                  body={tr(point.description, point.descriptionEn)}
                />
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.18} className="mt-6">
            <MarginNote label="0/100">
              {tr(
                "Độ tin cậy là mức phù hợp giữa ảnh của bạn và dữ liệu đối chiếu, không phải xác suất chắc chắn. Dưới 70% nên chụp thêm ảnh và theo dõi vài ngày.",
                "Confidence is how well your photo matches the reference data, not a certainty. Below 70%, take more photos and observe for a few days.",
              )}
            </MarginNote>
          </Reveal>
        </div>

        {/* ── Phải: phiếu kết quả minh họa ── */}
        <Reveal delay={0.1}>
          <PaperStack offset={20} from="left" className="lg:mr-5">
            <article
              className="rounded-[var(--r-2xl)] border border-line bg-surface-raised p-6 shadow-lg sm:p-8"
              aria-label={tr("Phiếu kết quả minh họa", "Illustrative result slip")}
            >
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-rule pb-5">
                <div>
                  <SpecimenLabel code="PHIEU 0247 · CA CHUA" tone="soil" />
                  <p className="mt-3 font-display text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
                    {tr("Đốm nâu trên lá cà chua", "Brown spots on tomato leaf")}
                  </p>
                </div>
                <span className="rounded-[4px] border border-sun/40 bg-sun-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-warning-ink">
                  {tr("Ví dụ minh họa", "Illustrative only")}
                </span>
              </header>

              {/* Khả năng cao nhất — nổi bật rõ hơn phần còn lại */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                    {tr("Khả năng cao nhất", "Top possibility")}
                  </p>
                  <p className="font-mono text-[26px] font-semibold leading-none tabular-nums text-leaf-strong sm:text-[30px]">
                    68%
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-leaf/12">
                  <div className="h-full w-[68%] rounded-full bg-leaf" />
                </div>
              </div>

              {/* Các khả năng còn lại — hàng mảnh, rõ là phụ */}
              <ul className="mt-5 space-y-2.5">
                {secondaryChances.map((chance) => (
                  <li key={chance.label} className="flex items-center gap-4">
                    <span className="w-[42%] shrink-0 truncate text-[13.5px] text-ink-soft">
                      {tr(chance.label, chance.labelEn)}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-leaf/12">
                      <span
                        className="block h-full rounded-full bg-leaf/55"
                        style={{ width: `${chance.value}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums text-ink-soft">
                      {chance.value}%
                    </span>
                  </li>
                ))}
              </ul>

              {/* Nguồn tham khảo */}
              <div className="mt-6 border-t border-paper-rule pt-5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-soil">
                  {tr("Nguồn tham khảo đã dùng", "Reference sources used")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    tr("Triệu chứng đốm nâu cà chua", "Tomato brown spot symptoms"),
                    tr("Hướng dẫn phòng trừ theo mùa", "Seasonal prevention guide"),
                  ].map((source, i) => (
                    <span
                      key={source}
                      className="inline-flex items-center gap-2 rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink"
                    >
                      <span className="font-mono text-[11px] text-soil">[{i + 1}]</span>
                      {source}
                      <ExternalLink size={12} aria-hidden className="text-ink-soft" />
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </PaperStack>
        </Reveal>
      </div>

      {/* Ghi chú an toàn — dải hairline mảnh, không phải khối cảnh báo lớn */}
      <Reveal delay={0.15}>
        <div className="mt-12 flex items-start gap-3 border-t border-sun/40 bg-sun-soft px-5 py-4 sm:items-center sm:px-6">
          <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-warning-ink sm:mt-0" />
          <p className="text-[13.5px] leading-[1.6] text-ink">
            <span className="font-semibold">
              {tr("Lưu ý khi sử dụng kết quả: ", "Note on using the results: ")}
            </span>
            {tr(
              "Kết quả AI mang tính tham khảo. Nếu cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi chuyên gia nông nghiệp tại địa phương.",
              "AI results are for reference. If disease spreads quickly or pesticides are needed, consult a local agriculture expert.",
            )}
          </p>
        </div>
      </Reveal>
    </NotebookSection>
  );
}
