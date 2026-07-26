"use client";

import { Reveal } from "@/components/ui/reveal";
import { PlateNumber } from "@/components/ui/field-notebook";
import { useTr } from "@/lib/use-tr";
import { supportedPlants } from "@/data/mock/plants";

/* V2: bỏ hoàn toàn icon chip 44x44. Dải khả năng trở thành 3 cột trên dòng kẻ,
   dẫn bằng số hiệu mono — cùng ngôn ngữ với quy trình và phiếu kết quả.
   Nội dung tiếng Việt/English giữ nguyên từng chữ. */
const capabilities = [
  {
    value: String(supportedPlants.length),
    valueEn: String(supportedPlants.length),
    label: "nhóm cây đang hỗ trợ",
    labelEn: "plant groups supported",
    detail: "Danh sách được mở rộng theo dữ liệu mô hình hiện có.",
    detailEn: "The list expands as the current model data grows.",
  },
  {
    value: "Top 5",
    valueEn: "Top 5",
    label: "khả năng được xếp hạng",
    labelEn: "ranked possibilities",
    detail: "Mỗi khả năng đi cùng mức độ tin cậy để bạn so sánh.",
    detailEn: "Each possibility comes with a confidence level so you can compare.",
  },
  {
    value: "Nguồn mở",
    valueEn: "Open sources",
    label: "khi đối chiếu triệu chứng",
    labelEn: "when cross-checking symptoms",
    detail: "Liên kết tham khảo được giữ lại để bạn tự kiểm tra.",
    detailEn: "Reference links are kept so you can check them yourself.",
  },
];

export function CapabilityStrip() {
  const tr = useTr();

  return (
    <section
      className="border-y border-line bg-surface px-5 sm:px-6 lg:px-8"
      aria-label={tr("Khả năng hiện có của Agromind AI", "Agromind AI current capabilities")}
    >
      <Reveal className="mx-auto max-w-[1440px]">
        <div className="grid sm:grid-cols-3">
          {capabilities.map(({ value, valueEn, label, labelEn, detail, detailEn }, index) => (
            <div
              key={label}
              className="flex items-start gap-4 border-t border-paper-rule py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:px-7 sm:py-7 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
            >
              <PlateNumber n={index + 1} tone="soil" size="sm" className="mt-1.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink sm:text-xl">
                  {tr(value, valueEn)}{" "}
                  <span className="text-[15px] font-bold text-ink-soft">{tr(label, labelEn)}</span>
                </p>
                <p className="mt-1.5 max-w-[34ch] text-[12.5px] font-medium leading-5 text-ink-soft">
                  {tr(detail, detailEn)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
