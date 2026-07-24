"use client";

import { ExternalLink, Layers3, ScanSearch } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { useTr } from "@/lib/use-tr";
import { supportedPlants } from "@/data/mock/plants";

const capabilities = [
  {
    icon: Layers3,
    value: String(supportedPlants.length),
    valueEn: String(supportedPlants.length),
    label: "nhóm cây đang hỗ trợ",
    labelEn: "plant groups supported",
    detail: "Danh sách được mở rộng theo dữ liệu mô hình hiện có.",
    detailEn: "The list expands as the current model data grows.",
  },
  {
    icon: ScanSearch,
    value: "Top 5",
    valueEn: "Top 5",
    label: "khả năng được xếp hạng",
    labelEn: "ranked possibilities",
    detail: "Mỗi khả năng đi cùng mức độ tin cậy để bạn so sánh.",
    detailEn: "Each possibility comes with a confidence level so you can compare.",
  },
  {
    icon: ExternalLink,
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
    <section className="section-grid border-y border-line bg-surface px-4 sm:px-6 lg:px-8" aria-label={tr("Khả năng hiện có của Agromind AI", "Agromind AI current capabilities")}>
      <Reveal className="mx-auto max-w-7xl">
        <div className="grid sm:grid-cols-3">
          {capabilities.map(({ icon: Icon, value, valueEn, label, labelEn, detail, detailEn }) => (
            <div key={label} className="flex gap-4 border-t border-line py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0 lg:py-8">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong">
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">
                  {tr(value, valueEn)} <span className="text-base font-bold">{tr(label, labelEn)}</span>
                </p>
                <p className="mt-1 max-w-[30ch] text-xs font-medium leading-5 text-ink-soft">{tr(detail, detailEn)}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
