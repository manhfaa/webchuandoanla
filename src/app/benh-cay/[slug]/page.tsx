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
import { guidanceForDiseaseText, normalizeDiseaseText } from "@/lib/disease-guidance";
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
    title: `Bệnh thường gặp trên ${crop.name} và cách nhận biết | Agromind AI`,
    description: `${crop.diseases.length} bệnh trên ${crop.name} mà Agromind AI nhận diện được từ ảnh lá: ${names}. Kèm việc nên làm ngay và khi nào cần hỏi chuyên gia.`,
    alternates: { canonical: `/benh-cay/${crop.slug}` },
    openGraph: {
      title: `Bệnh thường gặp trên ${crop.name}`,
      description: `Nhận biết ${crop.diseases.length} bệnh trên ${crop.name} từ ảnh lá.`,
      url: `/benh-cay/${crop.slug}`,
    },
  };
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

export default async function CropDiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const crop = findCropDiseases(slug);
  if (!crop || crop.diseases.length < 2) notFound();

  const image = plantImageFor(crop.plantId);
  const insight = plantInsightFor(crop.plantId);

  return (
    <AppShell>
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
            Agromind AI nhận diện được {crop.diseases.length} bệnh trên {crop.name} từ ảnh lá.
            {insight ? ` ${insight}` : ""}
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
            {crop.diseases.map((disease) => {
              // Same lookup the diagnosis screen uses, so this page cannot tell a
              // grower something different from what the app tells them.
              const guidance = guidanceForDiseaseText(
                normalizeDiseaseText(`${disease.className} ${crop.name} ${disease.name}`),
              );
              const risk = String(guidance.risk);

              return (
                <section key={disease.className} className="rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
                      {disease.name} trên {crop.name}
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

          <div className="mt-10 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6 text-center">
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
