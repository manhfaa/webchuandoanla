import { ExternalLink, Layers3, ScanSearch } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { supportedPlants } from "@/data/mock/plants";

const capabilities = [
  {
    icon: Layers3,
    value: String(supportedPlants.length),
    label: "nhóm cây đang hỗ trợ",
    detail: "Ưu tiên các cây quen thuộc với người trồng Việt Nam.",
  },
  {
    icon: ScanSearch,
    value: "Top 5",
    label: "khả năng được xếp hạng",
    detail: "Hiển thị độ tin cậy thay vì chỉ đưa ra một nhãn.",
  },
  {
    icon: ExternalLink,
    value: "Nguồn mở",
    label: "để bạn tự kiểm tra",
    detail: "Liên kết tham khảo xuất hiện khi đối chiếu triệu chứng.",
  },
];

export function CapabilityStrip() {
  return (
    <section className="relative z-10 px-4 sm:px-6 lg:px-8" aria-label="Thông tin nổi bật về Agromind AI">
      <Reveal className="mx-auto max-w-7xl">
        <div className="grid overflow-hidden rounded-xl border border-line bg-surface-raised shadow-lg sm:grid-cols-3">
          {capabilities.map(({ icon: Icon, value, label, detail }, index) => (
            <div
              key={label}
              className="group relative flex min-w-0 gap-4 border-t border-line p-5 first:border-t-0 sm:border-l sm:border-t-0 sm:p-6 sm:first:border-l-0"
            >
              <span
                className={
                  index === 1
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info"
                    : index === 2
                      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun/15 text-soil"
                      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong"
                }
              >
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tracking-[-0.025em] text-ink">
                  {value} <span className="text-base font-bold">{label}</span>
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-ink-soft">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
