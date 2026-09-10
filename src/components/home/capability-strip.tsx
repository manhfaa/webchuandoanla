"use client";

import { Reveal } from "@/components/ui/reveal";
import { CLASS_COUNT, VALIDATION_ACCURACY, VALIDATION_ACCURACY_EN } from "@/constants/model-facts";
import { supportedPlants } from "@/data/mock/plants";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/**
 * A ledger, not a row of icon cards: four measured numbers in a hairline grid.
 * Cropin and Plantix both open with a numbers strip and it is the one block on
 * their pages that reads as a company rather than a template — so long as every
 * figure is real. The accuracy carries its own caveat in the cell.
 */
export function CapabilityStrip() {
  const tr = useTr();

  const rows = [
    {
      value: String(supportedPlants.length),
      label: tr("nhóm cây đang hỗ trợ", "crop groups supported"),
      detail: tr(
        "Từ cà phê, hồ tiêu, điều đến rau màu quen thuộc; mở rộng theo dữ liệu mô hình.",
        "From coffee, black pepper and cashew to familiar vegetables; expands with the model data.",
      ),
    },
    {
      value: String(CLASS_COUNT),
      label: tr("loại bệnh và trạng thái lá", "diseases and leaf conditions"),
      detail: tr(
        "Gồm cả trạng thái lá khỏe, để lá bình thường không bị gán bệnh.",
        "Includes the healthy state, so a normal leaf is never labelled sick.",
      ),
    },
    {
      value: "Top 5",
      label: tr("khả năng, xếp theo mức tin cậy", "possibilities, ranked by confidence"),
      detail: tr(
        "Không rút gọn thành một đáp án chắc chắn; bạn đối chiếu và tự quyết.",
        "Never reduced to one certain answer; you compare and decide.",
      ),
    },
    {
      value: tr(VALIDATION_ACCURACY, VALIDATION_ACCURACY_EN),
      label: tr("đúng trên tập ảnh kiểm định", "correct on the validation set"),
      detail: tr(
        "Ảnh chụp ngoài vườn bị ngược sáng hay mờ có thể cho kết quả thấp hơn.",
        "Field photos that are backlit or blurry may score lower.",
      ),
    },
  ];

  return (
    <section
      className="border-y border-line bg-surface px-4 sm:px-6 lg:px-8"
      aria-label={tr("Số liệu hiện tại của Agromind AI", "Agromind AI current figures")}
    >
      <Reveal className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-1 border-b border-line py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="kicker">{tr("Năng lực hiện tại", "Current capability")}</p>
          <p className="text-xs text-ink-muted">{tr("Số liệu theo phiên bản mô hình đang chạy.", "Figures follow the model version currently running.")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={cn(
                "border-line py-7 sm:px-6 lg:py-9",
                index > 0 && "border-t",
                index % 2 === 1 && "sm:border-l",
                index < 2 && "sm:border-t-0",
                index > 0 && "lg:border-l lg:border-t-0",
                index === 0 && "sm:pl-0",
                index === rows.length - 1 && "lg:pr-0",
              )}
            >
              <p className="font-display text-4xl font-extrabold tabular-nums tracking-[-0.04em] text-leaf-strong sm:text-[44px] sm:leading-none">
                {row.value}
              </p>
              <p className="mt-3 text-sm font-semibold text-ink">{row.label}</p>
              <p className="mt-2 max-w-[32ch] text-xs leading-5 text-ink-soft">{row.detail}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
