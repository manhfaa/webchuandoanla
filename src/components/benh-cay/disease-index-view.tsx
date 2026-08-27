"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { CROP_DISEASES, plantImageFor } from "@/data/crop-diseases";
import { useLanguageStore } from "@/store/language-store";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

const TOTAL_DISEASES = CROP_DISEASES.reduce((sum, crop) => sum + crop.diseases.length, 0);

/** Thân trang /benh-cay. Tách khỏi trang server để dùng được useTr(). */
export function DiseaseIndexView() {
  const tr = useTr();
  const language = useLanguageStore((state) => state.language);
  const isEn = language === "en";

  return (
    <main id="main-content" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-4xl">
          {tr("Bệnh cây trồng nhận biết được từ ảnh lá", "Crop problems recognised from a leaf photo")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-ink-soft">
          {tr(
            `Agromind AI hiện nhận diện ${TOTAL_DISEASES} dấu hiệu sâu bệnh trên ${CROP_DISEASES.length} loại cây trồng. Chọn cây của bạn để xem từng loại và việc nên làm khi thấy dấu hiệu trên lá.`,
            `Agromind AI currently recognises ${TOTAL_DISEASES} pest and disease signs across ${CROP_DISEASES.length} crops. Pick your crop to see each one and what to do when you spot it on a leaf.`,
          )}
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--sun)_45%,transparent)] bg-sun-soft p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
          <p className="text-sm leading-7 text-ink-soft">
            {tr(
              "Thông tin ở đây mang tính tham khảo để bạn quan sát kỹ hơn, không thay thế đánh giá tại vườn. Khi cần dùng thuốc, hãy hỏi cán bộ kỹ thuật nông nghiệp địa phương.",
              "What is here is a reference to help you look more closely, not a substitute for judging the plant in front of you. Before you spray anything, ask a local agriculture technician.",
            )}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {CROP_DISEASES.map((crop) => {
            const image = plantImageFor(crop.plantId);
            const hasPage = crop.diseases.length >= 2;
            const names = crop.diseases.map((d) => (isEn ? d.nameEn : d.name)).join(" · ");

            const inner = (
              <>
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--r-md)] border border-line bg-surface-soft">
                  {image ? <Image src={image} alt="" fill sizes="64px" className="object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-ink">
                    {tr(crop.name, crop.nameEn)}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {tr(
                      `${crop.diseases.length} dấu hiệu sâu bệnh`,
                      `${crop.diseases.length} pest and disease signs`,
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-muted">{names}</span>
                </span>
                {hasPage ? (
                  <ArrowRight size={18} className="mt-1 shrink-0 text-leaf-strong" aria-hidden />
                ) : null}
              </>
            );

            return (
              <li key={crop.slug}>
                {hasPage ? (
                  <Link
                    href={`/benh-cay/${crop.slug}`}
                    className="flex min-h-[96px] items-start gap-3 rounded-[var(--r-lg)] border border-line bg-surface-raised p-4 transition hover:border-line-strong hover:bg-surface-soft motion-reduce:transition-none"
                  >
                    {inner}
                  </Link>
                ) : (
                  // Một bệnh thì chưa dựng thành trang. Vẫn liệt kê ở đây để cây
                  // còn tìm thấy được, nhưng không có gì để bấm sang.
                  <div className="flex min-h-[96px] items-start gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6 text-center">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Không tìm thấy cây của bạn trong danh sách?", "Cannot find your crop in the list?")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr(
              "Hệ thống nhận diện 89 nhóm ảnh lá khác nhau. Cứ chụp thử một tấm, kết quả sẽ cho biết các khả năng gần nhất kèm mức độ nặng.",
              "The system recognises 89 different leaf groups. Take a photo anyway and the result will show the closest matches and how serious each looks.",
            )}
          </p>
          <Link href="/register" className={cn(buttonVariants({ variant: "primary" }), "mt-5")}>
            <Camera size={18} aria-hidden /> {tr("Kiểm tra ảnh lá miễn phí", "Check a leaf for free")}
          </Link>
        </div>
      </div>
    </main>
  );
}
