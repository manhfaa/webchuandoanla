"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Camera, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  CROPS_WITH_PAGES,
  plantImageFor,
  plantInsightEnFor,
  plantInsightFor,
  type CropWithDiseases,
} from "@/data/crop-diseases";
import { guidanceForDiseaseText, normalizeDiseaseText } from "@/lib/disease-guidance";
import { diseaseAnchors } from "@/lib/disease-slug";
import { useLanguageStore } from "@/store/language-store";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/**
 * Thân trang /benh-cay/[slug], tách ra thành client component để dùng được
 * useTr().
 *
 * Trang cha vẫn là server component: nó giữ generateStaticParams và
 * generateMetadata, nên tiêu đề, mô tả và JSON-LD vẫn nằm sẵn trong HTML và vẫn
 * là tiếng Việt — đó là chủ ý, thị trường tìm kiếm của sản phẩm là Việt Nam.
 * Chỉ phần người dùng đọc trên màn hình mới đổi theo ngôn ngữ họ chọn.
 */

const RISK_LABEL: Record<string, { vi: string; en: string }> = {
  low: { vi: "Theo dõi thường", en: "Routine watch" },
  medium: { vi: "Cần theo dõi", en: "Worth watching" },
  high: { vi: "Cần xử lý sớm", en: "Act soon" },
  unknown: { vi: "Cần theo dõi", en: "Worth watching" },
};

const RISK_FILL: Record<string, string> = {
  low: "var(--leaf)",
  medium: "var(--sun)",
  high: "var(--danger)",
  unknown: "var(--sun)",
};

const fold = (value: string) =>
  value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Một số tên bệnh đã tự mang tên cây — "Thối đen trên nho", "Black Rot On
 * Grape". Nối thêm " trên {cây}" vào những tên đó cho ra "Thối đen trên nho
 * trên Nho", đọc như máy viết mà không ai nhìn lại.
 */
function headingFor(diseaseName: string, cropName: string, joiner: string): string {
  const folded = fold(diseaseName);
  if (folded.includes(fold(cropName))) return diseaseName;

  // Tên bệnh nói "ngô", không bao giờ nói "Ngô (bắp)", nên dạng có ngoặc không
  // bao giờ khớp và "Virus sọc lá ngô" sẽ bị nối thêm " trên Ngô (bắp)".
  const bare = cropName.replace(/\s*\(.*?\)\s*/g, " ").trim();
  if (bare && bare !== cropName && folded.includes(fold(bare))) return diseaseName;

  // "Đốm đỏ trên lá" đã có sẵn một mệnh đề "trên". Nối thêm cái thứ hai thành
  // "Đốm đỏ trên lá trên Chè"; tiêu đề h1 phía trên đã nói rõ cây rồi.
  if (folded.includes(" tren ") || folded.includes(" on ")) return diseaseName;

  return `${diseaseName}${joiner}${cropName}`;
}

export function CropDiseaseView({ crop }: { crop: CropWithDiseases }) {
  const tr = useTr();
  const language = useLanguageStore((state) => state.language);
  const isEn = language === "en";

  const image = plantImageFor(crop.plantId);
  const insight = isEn ? plantInsightEnFor(crop.plantId) : plantInsightFor(crop.plantId);
  const cropName = isEn ? crop.nameEn : crop.name;

  // Neo luôn dựng từ tên tiếng Việt, không đổi theo ngôn ngữ: đổi là mọi liên
  // kết đã chia sẻ và mọi URL trong JSON-LD sẽ trỏ vào hư không.
  const anchors = diseaseAnchors(crop.diseases.map((disease) => disease.name));
  const otherCrops = CROPS_WITH_PAGES.filter((entry) => entry.slug !== crop.slug);

  return (
    <main id="main-content" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/benh-cay"
          // -ml-2 px-2 để vùng chạm 44px không đẩy chữ thụt vào so với tiêu đề.
          className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-leaf-strong underline underline-offset-4"
        >
          <ArrowLeft size={16} aria-hidden /> {tr("Tất cả cây trồng", "All crops")}
        </Link>

        <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-4xl">
          {tr(`Bệnh thường gặp trên ${crop.name}`, `Common problems on ${crop.nameEn}`)}
        </h1>
        <p className="mt-4 text-base leading-8 text-ink-soft">
          {tr(
            `Agromind AI nhận diện được ${crop.diseases.length} dấu hiệu sâu bệnh trên ${crop.name} từ ảnh lá.`,
            `Agromind AI recognises ${crop.diseases.length} pest and disease signs on ${crop.nameEn} from a leaf photo.`,
          )}
          {insight ? ` ${insight}` : ""}
        </p>

        {image ? (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[var(--r-lg)] border border-line-strong">
            <Image
              src={image}
              alt={tr(`Lá ${crop.name}`, `${crop.nameEn} leaf`)}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        {/* Đặt trước danh sách, không phải sau. Người cuộn xuống, đọc tên một
            bệnh rồi rời đi vẫn phải đi qua đoạn này. */}
        <div className="mt-6 flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--sun)_45%,transparent)] bg-sun-soft p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
          <p className="text-sm leading-7 text-ink-soft">
            {tr(
              "Trang này mô tả những bệnh hệ thống nhận biết được và việc nên làm ngay khi thấy dấu hiệu. Đây là thông tin tham khảo, không phải chẩn đoán chắc chắn. Nếu bệnh lan nhanh, xuất hiện trên nhiều cây hoặc bạn định dùng thuốc, hãy hỏi cán bộ kỹ thuật nông nghiệp tại địa phương trước khi xử lý.",
              "This page lists the problems the system can recognise and what to do first when you see the signs. It is a reference, not a firm diagnosis. If it spreads quickly, shows up on several plants, or you are thinking about spraying, ask a local agriculture technician before you act.",
            )}
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {crop.diseases.map((disease, index) => {
            // Cùng phép tra mà màn hình chẩn đoán dùng, nên trang này không thể
            // nói với người trồng một điều khác với điều ứng dụng nói.
            const guidance = guidanceForDiseaseText(
              normalizeDiseaseText(`${disease.className} ${crop.name} ${disease.name}`),
              language,
            );
            const risk = String(guidance.risk);
            const riskLabel = RISK_LABEL[risk] ?? RISK_LABEL.unknown;

            return (
              // scroll-mt-28 vì Navbar là fixed: thiếu nó thì nhảy tới neo nào,
              // tiêu đề mục đó cũng nằm khuất sau thanh điều hướng.
              <section
                key={disease.className}
                id={anchors[index]}
                className="scroll-mt-28 rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
                    {isEn
                      ? headingFor(disease.nameEn, crop.nameEn, " on ")
                      : headingFor(disease.name, crop.name, " trên ")}
                  </h2>
                  <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-bold text-ink">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: RISK_FILL[risk] ?? RISK_FILL.unknown }}
                    />
                    {tr(riskLabel.vi, riskLabel.en)}
                  </span>
                </div>

                <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.1em] text-leaf-strong">
                  {tr("Nên làm ngay", "Do this now")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {guidance.immediate.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-7 text-ink-soft">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.1em] text-leaf-strong">
                  {tr("Theo dõi tiếp", "Then keep watching")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {guidance.followUp.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-7 text-ink-soft">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {guidance.safety.length ? (
                  <div className="mt-5 flex items-start gap-2.5 rounded-[var(--r-md)] border border-line bg-surface-soft p-3.5">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
                    <p className="text-sm leading-6 text-ink-soft">{guidance.safety.join(" ")}</p>
                  </div>
                ) : null}

                <p className="mt-4 text-xs leading-6 text-ink-muted">
                  {tr(
                    `Nên chụp lại cùng vị trí sau khoảng ${guidance.recheckDays} ngày để so sánh.`,
                    `Photograph the same spot again in about ${guidance.recheckDays} days and compare.`,
                  )}
                  {guidance.expertRequired
                    ? tr(
                        " Trường hợp này nên hỏi thêm chuyên gia địa phương.",
                        " For this one, it is worth asking a local expert as well.",
                      )
                    : ""}
                </p>
              </section>
            );
          })}
        </div>

        {/* Trước đây mỗi trang cây là một ngõ cụt: chỉ có đường về /benh-cay và
            /register. Bộ thu thập của Google đi vào một trang rồi phải quay ra
            mới sang được cây khác, còn người đọc thì không thấy 13 trang kia
            tồn tại. */}
        <nav
          aria-label={tr("Bệnh trên cây trồng khác", "Problems on other crops")}
          className="mt-10 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6"
        >
          <h2 className="font-display text-lg font-bold text-ink">
            {tr("Bệnh trên cây trồng khác", "Problems on other crops")}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {otherCrops.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/benh-cay/${other.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-line-strong hover:text-leaf-strong"
                >
                  {tr(other.name, other.nameEn)}
                  <span className="text-xs font-medium text-ink-muted">{other.diseases.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6 text-center">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr(
              `Không chắc lá ${crop.name} nhà bạn đang bị gì?`,
              `Not sure what is on your ${crop.nameEn.toLowerCase()} leaves?`,
            )}
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr(
              "Chụp một tấm ảnh lá, hệ thống sẽ đưa ra các khả năng kèm mức độ nặng.",
              "Take one photo of a leaf and the system will show the likely causes and how serious each looks.",
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
