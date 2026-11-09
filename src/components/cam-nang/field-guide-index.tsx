"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { FIELD_GUIDES } from "@/data/field-guides";
import { useTr } from "@/lib/use-tr";

export function FieldGuideIndex() {
  const tr = useTr();

  return (
    <main id="main-content" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/benh-cay" className="inline-flex min-h-11 items-center text-sm font-semibold text-leaf-strong underline underline-offset-4">
          {tr("Danh mục bệnh cây", "Crop problem directory")}
        </Link>
        <div className="mt-5 max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-leaf-strong"><BookOpen size={17} aria-hidden /> {tr("Cẩm nang thực địa", "Field guides")}</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] text-ink sm:text-5xl">
            {tr("Quan sát trước khi kết luận.", "Observe before you conclude.")}
          </h1>
          <p className="mt-5 text-base leading-8 text-ink-soft">
            {tr("Ba hướng dẫn đọc dấu hiệu trên lá, phân biệt nguyên nhân dễ nhầm và chọn việc cần kiểm tra tiếp. Ảnh minh họa và nguồn khoa học được ghi rõ ở từng bài.", "Three guides to reading leaf signs, separating common lookalikes and deciding what to check next. Each guide credits its photos and research sources.")}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FIELD_GUIDES.map((guide, index) => (
            <Link key={guide.slug} href={`/cam-nang/${guide.slug}`} className="group overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface-raised transition hover:-translate-y-1 hover:border-line-strong hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-soft">
                <Image src={guide.photo.src} alt={tr(guide.photoAlt.vi, guide.photoAlt.en)} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transform-none" />
                <span className="absolute left-4 top-4 rounded-full bg-forest px-3 py-1 text-xs font-bold text-on-forest">0{index + 1} / 0{FIELD_GUIDES.length}</span>
              </div>
              <div className="p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold leading-snug text-ink">{tr(guide.title.vi, guide.title.en)}</h2>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{tr(guide.summary.vi, guide.summary.en)}</p>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-leaf-strong">{tr("Đọc hướng dẫn", "Read guide")} <ArrowRight size={17} aria-hidden /></span>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-7 text-ink-soft">
          {tr("Nội dung chỉ hỗ trợ quan sát, không phải chẩn đoán chắc chắn hay đơn thuốc. Nếu bệnh lan nhanh hoặc cần sử dụng thuốc, hãy hỏi cán bộ kỹ thuật nông nghiệp tại địa phương.", "These guides support observation, not a confirmed diagnosis or a prescription. Ask a local agricultural specialist if symptoms spread quickly or pesticides are being considered.")}
        </p>
      </div>
    </main>
  );
}
