"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { CROP_DISEASES, CROPS_WITH_PAGES, plantImageFor } from "@/data/crop-diseases";
import { diseaseAnchors } from "@/lib/disease-slug";
import { useLanguageStore } from "@/store/language-store";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

const TOTAL_DISEASES = CROP_DISEASES.reduce((sum, crop) => sum + crop.diseases.length, 0);

const QUICK_SEARCHES = [
  { slug: "ca-chua", disease: "Cháy lá muộn", vi: "Cà chua bị cháy lá muộn: nên làm gì?", en: "Tomato late blight: what to do next?" },
  { slug: "ca-chua", disease: "Đốm vi khuẩn", vi: "Lá cà chua bị đốm vi khuẩn: kiểm tra thế nào?", en: "Bacterial spot on tomato leaves: what to check?" },
  { slug: "xoai", disease: "Bệnh thán thư", vi: "Xoài bị thán thư: cần theo dõi gì?", en: "Mango anthracnose: what should I monitor?" },
  { slug: "ca-phe", disease: "Gỉ sắt", vi: "Lá cà phê bị gỉ sắt: nên làm gì trước?", en: "Coffee leaf rust: what should I do first?" },
  { slug: "ngo-bap", disease: "Cháy lá phương Bắc", vi: "Ngô bị cháy lá phương Bắc: nên theo dõi gì?", en: "Northern corn leaf blight: what to monitor?" },
  { slug: "dua-chuot", disease: "Bệnh sương mai", vi: "Dưa chuột bị sương mai: cần theo dõi gì?", en: "Downy mildew on cucumber: what to monitor?" },
  { slug: "khoai-tay", disease: "Cháy lá sớm", vi: "Khoai tây bị cháy lá sớm: nên làm gì?", en: "Potato early blight: what to do next?" },
  { slug: "san", disease: "Virus khảm", vi: "Lá sắn bị virus khảm: nên kiểm tra gì?", en: "Cassava mosaic virus: what to check?" },
].flatMap((item) => {
  const crop = CROPS_WITH_PAGES.find((entry) => entry.slug === item.slug);
  const index = crop?.diseases.findIndex((disease) => disease.name === item.disease) ?? -1;
  if (!crop || index < 0) return [];
  const anchor = diseaseAnchors(crop.diseases.map((disease) => disease.name))[index];
  return [{ ...item, href: `/benh-cay/${crop.slug}#${anchor}` }];
});

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
        <p className="mt-5 text-sm leading-7 text-ink-soft">
          {tr("Chưa chắc ảnh lá đã đủ rõ?", "Not sure your leaf photo is clear enough?")} {" "}
          <Link href="/huong-dan" className="font-semibold text-leaf-strong underline underline-offset-4">
            {tr("Xem cách chụp ảnh và đọc kết quả AI", "Learn how to take a photo and read the AI result")}
          </Link>
        </p>

        <nav aria-label={tr("Tìm nhanh theo vấn đề trên lá", "Find a leaf problem")}
          className="mt-8 rounded-[var(--r-lg)] border border-line bg-surface-soft p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Tìm nhanh theo vấn đề trên lá", "Find a leaf problem")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr("Chọn cây và dấu hiệu bạn muốn tìm hiểu để tới đúng phần hướng dẫn tham khảo.", "Choose a crop and a sign to jump to the relevant reference guidance.")}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {QUICK_SEARCHES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--r-md)] border border-line bg-surface px-4 py-2.5 text-sm font-semibold leading-6 text-ink transition hover:border-line-strong hover:text-leaf-strong motion-reduce:transition-none">
                  <span>{tr(item.vi, item.en)}</span>
                  <ArrowRight size={16} className="shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

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
