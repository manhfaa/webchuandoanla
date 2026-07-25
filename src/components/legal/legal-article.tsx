"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LEGAL_UPDATED, type LegalDoc } from "@/data/legal-content";
import { useLanguageStore } from "@/store/language-store";
import { useTr } from "@/lib/use-tr";

export function LegalArticle({ doc }: { doc: LegalDoc }) {
  const tr = useTr();
  const language = useLanguageStore((state) => state.language);
  const pick = (value: { vi: string; en: string }) => (language === "en" ? value.en : value.vi);
  const pickList = (value: { vi: string[]; en: string[] }) => (language === "en" ? value.en : value.vi);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-leaf-strong"
      >
        <ArrowLeft size={16} aria-hidden /> {tr("Về trang chủ", "Back to home")}
      </Link>

      <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight tracking-[-0.035em] text-ink sm:text-[42px]">
        {pick(doc.title)}
      </h1>
      <p className="mt-3 text-sm font-medium text-ink-soft">{pick(LEGAL_UPDATED)}</p>
      <p className="mt-6 text-base leading-8 text-ink-soft">{pick(doc.intro)}</p>

      <div className="mt-10 space-y-9">
        {doc.sections.map((section) => (
          <section key={section.heading.vi}>
            <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
              {pick(section.heading)}
            </h2>
            {section.body ? (
              <p className="mt-3 text-sm leading-8 text-ink-soft sm:text-base">{pick(section.body)}</p>
            ) : null}
            {section.list ? (
              <ul className="mt-3 space-y-2.5">
                {pickList(section.list).map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-ink-soft sm:text-base">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="mt-12 rounded-[var(--r-lg)] border border-line bg-surface-soft p-5 text-xs leading-7 text-ink-soft">
        {tr(
          "Kết quả từ Agromind AI mang tính hỗ trợ tham khảo, không thay thế ý kiến của chuyên gia nông nghiệp tại địa phương.",
          "Results from Agromind AI are advisory only and do not replace the advice of a local agriculture expert.",
        )}
      </p>
    </div>
  );
}
