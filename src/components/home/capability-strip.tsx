import { ExternalLink, Layers3, ScanSearch } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { supportedPlants } from "@/data/mock/plants";

const capabilities = [
  {
    icon: Layers3,
    value: String(supportedPlants.length),
    label: "nhóm cây đang hỗ trợ",
    detail: "Danh sách được mở rộng theo dữ liệu mô hình hiện có.",
  },
  {
    icon: ScanSearch,
    value: "Top 5",
    label: "khả năng được xếp hạng",
    detail: "Mỗi khả năng đi cùng mức độ tin cậy để bạn so sánh.",
  },
  {
    icon: ExternalLink,
    value: "Nguồn mở",
    label: "khi đối chiếu triệu chứng",
    detail: "Liên kết tham khảo được giữ lại để bạn tự kiểm tra.",
  },
];

export function CapabilityStrip() {
  return (
    <section className="section-grid border-y border-line bg-surface px-4 sm:px-6 lg:px-8" aria-label="Khả năng hiện có của Agromind AI">
      <Reveal className="mx-auto max-w-7xl">
        <div className="grid sm:grid-cols-3">
          {capabilities.map(({ icon: Icon, value, label, detail }) => (
            <div key={label} className="flex gap-4 border-t border-line py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0 lg:py-8">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong">
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">
                  {value} <span className="text-base font-bold">{label}</span>
                </p>
                <p className="mt-1 max-w-[30ch] text-xs font-medium leading-5 text-ink-soft">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
