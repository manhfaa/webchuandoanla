"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, ExternalLink, ShieldAlert } from "lucide-react";

import type { FieldGuide } from "@/data/field-guides";
import { useTr } from "@/lib/use-tr";

function GuideList({ items }: { items: FieldGuide["signs"] }) {
  const tr = useTr();
  return (
    <ol className="mt-5 space-y-4">
      {items.map((item, index) => (
        <li key={item.vi} className="flex gap-4 text-sm leading-7 text-ink-soft sm:text-base">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft font-bold tabular-nums text-leaf-strong">{index + 1}</span>
          <span>{tr(item.vi, item.en)}</span>
        </li>
      ))}
    </ol>
  );
}

export function FieldGuideArticle({ guide }: { guide: FieldGuide }) {
  const tr = useTr();

  return (
    <main id="main-content" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-4xl">
        <Link href="/cam-nang" className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-leaf-strong underline underline-offset-4"><ArrowLeft size={16} aria-hidden /> {tr("Cẩm nang thực địa", "Field guides")}</Link>
        <header className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf-strong">{tr("Đọc dấu hiệu trên lá", "Reading leaf signs")}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-[1.15] tracking-[-0.04em] text-ink sm:text-5xl">{tr(guide.title.vi, guide.title.en)}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-ink-soft sm:text-lg">{tr(guide.summary.vi, guide.summary.en)}</p>
        </header>

        <figure className="mt-8 overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface-raised">
          <div className="relative aspect-[16/10] bg-surface-soft sm:aspect-[16/9]">
            <Image src={guide.photo.src} alt={tr(guide.photoAlt.vi, guide.photoAlt.en)} fill priority sizes="(min-width: 768px) 896px, 100vw" className="object-cover" />
          </div>
          <figcaption className="px-4 py-3 text-xs leading-6 text-ink-soft sm:px-5">
            {tr(guide.photoNote.vi, guide.photoNote.en)}{" "}
            <a href={guide.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-leaf-strong underline underline-offset-2">{guide.photo.credit}<span className="sr-only"> ({tr("mở tab mới", "opens in new tab")})</span></a>
          </figcaption>
        </figure>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf-strong">01 / {tr("Quan sát", "Observe")}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">{tr("Nhìn những gì?", "What should you inspect?")}</h2>
            <GuideList items={guide.signs} />
          </section>
          <section className="rounded-[var(--r-lg)] border border-line bg-surface-soft p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf-strong">02 / {tr("Đối chiếu", "Compare")}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">{tr("Dễ nhầm với gì?", "What can look similar?")}</h2>
            <GuideList items={guide.lookalikes} />
          </section>
        </div>

        <section className="mt-5 rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf-strong">03 / {tr("Hành động", "Next steps")}</p>
          <h2 className="mt-3 font-display text-2xl font-bold text-ink">{tr("Việc nên làm tiếp", "What to do next")}</h2>
          <GuideList items={guide.actions} />
        </section>

        <aside className="mt-5 flex gap-4 rounded-[var(--r-lg)] border border-line bg-sun-soft p-5 sm:p-7">
          <ShieldAlert size={22} className="mt-1 shrink-0 text-warning-ink" aria-hidden />
          <div><h2 className="font-display text-lg font-bold text-ink">{tr("Khi nào cần người kiểm tra tại vườn?", "When is an on-site check needed?")}</h2><p className="mt-2 text-sm leading-7 text-ink-soft">{tr(guide.escalation.vi, guide.escalation.en)}</p></div>
        </aside>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-xl font-bold text-ink">{tr("Nguồn đối chiếu", "Research sources")}</h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{tr("Nội dung được biên tập lại từ các tài liệu khuyến nông; hướng dẫn của địa phương và điều kiện vườn thực tế luôn cần được ưu tiên.", "Summarized from extension resources; local guidance and actual field conditions still take precedence.")}</p>
          <ul className="mt-4 space-y-2">
            {guide.sources.map((source) => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold leading-6 text-leaf-strong underline underline-offset-4"><ExternalLink size={16} className="shrink-0" aria-hidden /> {source.name}<span className="sr-only"> ({tr("mở tab mới", "opens in new tab")})</span></a></li>
            ))}
          </ul>
        </section>

        <nav aria-label={tr("Đọc tiếp", "Read next")} className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link href={`/benh-cay/${guide.cropSlug}`} className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--r-md)] border border-line bg-surface-raised px-5 py-3 text-sm font-bold text-ink hover:border-line-strong">{tr("Xem các dấu hiệu khác trên cây này", "See other problems on this crop")} <ArrowRight size={18} aria-hidden /></Link>
          <Link href="/huong-dan" className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--r-md)] border border-line bg-surface-raised px-5 py-3 text-sm font-bold text-ink hover:border-line-strong"><span className="inline-flex items-center gap-2"><Camera size={18} aria-hidden /> {tr("Chụp ảnh lá để kiểm tra", "Photograph a leaf for a check")}</span><ArrowRight size={18} aria-hidden /></Link>
        </nav>
      </article>
    </main>
  );
}
