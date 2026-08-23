import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Camera, ShieldAlert } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AppShell } from "@/components/layout/layout-components";
import { buttonVariants } from "@/components/ui/button";
import { CROPS_WITH_PAGES, findCropDiseases, plantImageFor, plantInsightFor } from "@/data/crop-diseases";
import { CropDiseaseSchema } from "@/components/system/page-schema";
import { guidanceForDiseaseText, normalizeDiseaseText } from "@/lib/disease-guidance";
import { diseaseAnchors } from "@/lib/disease-slug";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return CROPS_WITH_PAGES.map((crop) => ({ slug: crop.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const crop = findCropDiseases(slug);
  if (!crop) return {};

  const names = crop.diseases.map((d) => d.name.toLowerCase()).slice(0, 4).join(", ");
  return {
    // Tiêu đề cũ — "Bệnh thường gặp trên X và cách nhận biết" — không chứa tên
    // bệnh nào, trong khi tên bệnh mới là nhóm từ khoá một tên miền vài ngày
    // tuổi có cơ hội thắng. "bệnh cà chua" thì không.
    title: titleFor(crop),
    // "sâu bệnh", not "bệnh": the list includes nhện, sâu đục lá, mọt and muỗi,
    // which are pests rather than diseases. It is also the word a Vietnamese
    // grower actually types.
    // Google cắt mô tả quanh 155 ký tự. Bản cũ dài 190-210 và luôn bị cắt đúng
    // vào câu hứa hành động, nên phần người đọc thấy chỉ còn danh sách tên bệnh.
    description: `${crop.diseases.length} dấu hiệu sâu bệnh trên ${crop.name}: ${names}. Cách nhận biết và việc nên làm ngay.`,
    alternates: { canonical: `/benh-cay/${crop.slug}` },
    openGraph: {
      title: `Bệnh thường gặp trên ${crop.name}`,
      description: `Nhận biết ${crop.diseases.length} dấu hiệu sâu bệnh trên ${crop.name} từ ảnh lá.`,
      url: `/benh-cay/${crop.slug}`,
      // Khai openGraph ở trang con THAY THẾ toàn bộ openGraph của layout, kể cả
      // images. Thiếu dòng này thì 15 trang /benh-cay chia sẻ lên Zalo hay
      // Facebook đều hiện ra không có ảnh.
    images: [
      { url: "/og-image.jpg", width: 1200, height: 630, alt: "Agromind AI kiểm tra ảnh lá cây" },
    ],
    },
  };
}

/**
 * Tiêu đề nhồi được nhiều tên bệnh nhất trong giới hạn Google hiển thị.
 *
 * Google cắt tiêu đề quanh 60 ký tự. Hậu tố thương hiệu chiếm 14, nên phần còn
 * lại được dùng để liệt kê tên bệnh — mỗi tên là một truy vấn riêng mà trang có
 * thể xếp hạng, thay vì một câu chung chung không ai gõ.
 */
const TITLE_SUFFIX = " | Agromind AI";
const TITLE_BUDGET = 60;

function titleFor(crop: { name: string; diseases: { name: string }[] }): string {
  const base = `Bệnh ${crop.name.toLowerCase()}`;
  const picked: string[] = [];

  for (const disease of crop.diseases) {
    const name = disease.name.toLowerCase();
    const next = `${base}: ${[...picked, name].join(", ")}${TITLE_SUFFIX}`;
    if (next.length > TITLE_BUDGET) break;
    picked.push(name);
  }

  // Cây có tên bệnh dài tới mức không nhét nổi cái nào thì quay về câu mô tả.
  if (!picked.length) return `Bệnh thường gặp trên ${crop.name}${TITLE_SUFFIX}`;
  return `${base}: ${picked.join(", ")}${TITLE_SUFFIX}`;
}

const RISK_LABEL: Record<string, string> = {
  low: "Theo dõi thường",
  medium: "Cần theo dõi",
  high: "Cần xử lý sớm",
  unknown: "Cần theo dõi",
};

const RISK_FILL: Record<string, string> = {
  low: "var(--leaf)",
  medium: "var(--sun)",
  high: "var(--danger)",
  unknown: "var(--sun)",
};

/**
 * Some disease names already carry the crop — "Thối đen trên nho", "Virus xoăn
 * vàng lá cà chua". Appending " trên {crop}" to those produced "Thối đen trên
 * nho trên Nho", which reads like something a machine wrote without looking.
 */
function headingFor(diseaseName: string, cropName: string): string {
  const fold = (v: string) =>
    v.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();

  const folded = fold(diseaseName);
  if (folded.includes(fold(cropName))) return diseaseName;

  // A disease name says "ngô", never "Ngô (bắp)", so the parenthetical form
  // never matches and "Virus sọc lá ngô" would pick up " trên Ngô (bắp)".
  const bare = cropName.replace(/\s*\(.*?\)\s*/g, " ").trim();
  if (bare && bare !== cropName && folded.includes(fold(bare))) return diseaseName;

  // "Đốm đỏ trên lá" already carries a "trên" clause. Appending a second one
  // gave "Đốm đỏ trên lá trên Chè"; the h1 above already names the crop.
  if (folded.includes(" tren ")) return diseaseName;

  return `${diseaseName} trên ${cropName}`;
}

export default async function CropDiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const crop = findCropDiseases(slug);
  if (!crop || crop.diseases.length < 2) notFound();

  const image = plantImageFor(crop.plantId);
  const insight = plantInsightFor(crop.plantId);
  // Cùng một hàm mà CropDiseaseSchema dùng, nên neo trong JSON-LD luôn khớp neo
  // thật trên trang.
  const anchors = diseaseAnchors(crop.diseases.map((disease) => disease.name));
  const otherCrops = CROPS_WITH_PAGES.filter((entry) => entry.slug !== crop.slug);

  return (
    <AppShell>
      <CropDiseaseSchema crop={crop} />
      <Navbar />
      <main id="main-content" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/benh-cay"
            // -ml-2 px-2 so the 44px tap target does not visually indent the
            // text away from the heading below it.
            className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-leaf-strong underline underline-offset-4"
          >
            <ArrowLeft size={16} aria-hidden /> Tất cả cây trồng
          </Link>

          <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-4xl">
            Bệnh thường gặp trên {crop.name}
          </h1>
          <p className="mt-4 text-base leading-8 text-ink-soft">
            Agromind AI nhận diện được {crop.diseases.length} dấu hiệu sâu bệnh trên {crop.name} từ
            ảnh lá.{insight ? ` ${insight}` : ""}
          </p>

          {image ? (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[var(--r-lg)] border border-line-strong">
              <Image
                src={image}
                alt={`Lá ${crop.name}`}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}

          {/* Stated before the list, not after it. Someone who scrolls, reads a
              disease name and leaves must still have passed this. */}
          <div className="mt-6 flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--sun)_45%,transparent)] bg-sun-soft p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
            <p className="text-sm leading-7 text-ink-soft">
              Trang này mô tả những bệnh hệ thống nhận biết được và việc nên làm ngay khi thấy dấu
              hiệu. Đây là thông tin tham khảo, không phải chẩn đoán chắc chắn. Nếu bệnh lan nhanh,
              xuất hiện trên nhiều cây hoặc bạn định dùng thuốc, hãy hỏi cán bộ kỹ thuật nông nghiệp
              tại địa phương trước khi xử lý.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {crop.diseases.map((disease, index) => {
              // Same lookup the diagnosis screen uses, so this page cannot tell a
              // grower something different from what the app tells them.
              const guidance = guidanceForDiseaseText(
                normalizeDiseaseText(`${disease.className} ${crop.name} ${disease.name}`),
              );
              const risk = String(guidance.risk);

              return (
                // scroll-mt-28 vì Navbar là fixed: thiếu nó thì nhảy tới neo
                // nào, tiêu đề mục đó cũng nằm khuất sau thanh điều hướng.
                <section
                  key={disease.className}
                  id={anchors[index]}
                  className="scroll-mt-28 rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
                      {headingFor(disease.name, crop.name)}
                    </h2>
                    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-bold text-ink">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: RISK_FILL[risk] ?? RISK_FILL.unknown }}
                      />
                      {RISK_LABEL[risk] ?? RISK_LABEL.unknown}
                    </span>
                  </div>

                  <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.1em] text-leaf-strong">
                    Nên làm ngay
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
                    Theo dõi tiếp
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
                    Nên chụp lại cùng vị trí sau khoảng {guidance.recheckDays} ngày để so sánh.
                    {guidance.expertRequired ? " Trường hợp này nên hỏi thêm chuyên gia địa phương." : ""}
                  </p>
                </section>
              );
            })}
          </div>

          {/* Trước đây mỗi trang cây là một ngõ cụt: chỉ có đường về /benh-cay
              và /register. Bộ thu thập của Google đi vào một trang rồi phải quay
              ra mới sang được cây khác, còn người đọc thì không thấy 13 trang
              kia tồn tại. */}
          <nav
            aria-label="Bệnh trên cây trồng khác"
            className="mt-10 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6"
          >
            <h2 className="font-display text-lg font-bold text-ink">Bệnh trên cây trồng khác</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {otherCrops.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/benh-cay/${other.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-line-strong hover:text-leaf-strong"
                  >
                    {other.name}
                    <span className="text-xs font-medium text-ink-muted">{other.diseases.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6 text-center">
            <h2 className="font-display text-xl font-bold text-ink">
              Không chắc lá {crop.name} nhà bạn đang bị gì?
            </h2>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              Chụp một tấm ảnh lá, hệ thống sẽ đưa ra các khả năng kèm mức độ nặng.
            </p>
            <Link href="/register" className={cn(buttonVariants({ variant: "primary" }), "mt-5")}>
              <Camera size={18} aria-hidden /> Kiểm tra ảnh lá miễn phí
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </AppShell>
  );
}
