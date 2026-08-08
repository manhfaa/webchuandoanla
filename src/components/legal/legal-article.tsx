"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUp, ChevronDown, UserPlus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { LEGAL_UPDATED, type LegalDoc } from "@/data/legal-content";
import { useLanguageStore } from "@/store/language-store";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/**
 * Điều khoản có 18 mục, Quyền riêng tư có 12. Trước đây trang chỉ có đúng một
 * liên kết "Về trang chủ" ở đầu và không có gì khác: đọc xong là người dùng bị
 * bỏ lại ở cuối một văn bản dài, không có đường quay lại, cũng không có cách
 * nào sang tài liệu còn lại ngoài việc quay về trang đăng ký bấm liên kết kia.
 *
 * Ba thứ được thêm: chuyển qua lại giữa hai tài liệu, mục lục để nhảy thẳng
 * tới phần cần đọc, và một thẻ ở cuối đưa người đọc về đúng việc họ đang làm dở.
 */

const DOCS = [
  { href: "/terms", label: { vi: "Điều khoản", en: "Terms" }, full: { vi: "Điều khoản sử dụng", en: "Terms of Service" } },
  { href: "/privacy", label: { vi: "Quyền riêng tư", en: "Privacy" }, full: { vi: "Chính sách quyền riêng tư", en: "Privacy Policy" } },
] as const;

/**
 * Neo của mục lấy từ SỐ THỨ TỰ trong tiêu đề, không phải từ chữ.
 *
 * Nếu tạo neo bằng cách rút gọn tiêu đề thì bản tiếng Việt và tiếng Anh sẽ ra
 * hai neo khác nhau, và mọi liên kết đã chia sẻ sẽ chết ngay khi người đọc đổi
 * ngôn ngữ. Số thứ tự thì giống nhau ở cả hai bản.
 */
function sectionId(headingVi: string, index: number): string {
  const numbered = headingVi.match(/^(\d+)\./);
  return `muc-${numbered ? numbered[1] : index + 1}`;
}

export function LegalArticle({ doc }: { doc: LegalDoc }) {
  const tr = useTr();
  const pathname = usePathname();
  const language = useLanguageStore((state) => state.language);
  const pick = (value: { vi: string; en: string }) => (language === "en" ? value.en : value.vi);
  const pickList = (value: { vi: string[]; en: string[] }) => (language === "en" ? value.en : value.vi);

  const other = DOCS.find((entry) => entry.href !== pathname) ?? DOCS[1];

  return (
    <div id="dau-trang" className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          // -ml-2 px-2 để vùng chạm 44px không đẩy chữ thụt vào so với tiêu đề.
          className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-ink-soft transition hover:text-leaf-strong"
        >
          <ArrowLeft size={16} aria-hidden /> {tr("Về trang chủ", "Back to home")}
        </Link>

        <nav
          aria-label={tr("Chuyển giữa hai tài liệu", "Switch between documents")}
          className="inline-flex rounded-full border border-line bg-surface-soft p-1"
        >
          {DOCS.map((entry) => {
            const active = entry.href === pathname;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // min-h-11: 44px, cùng cỡ vùng chạm với các liên kết khác trong app.
                  "inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold transition sm:text-sm",
                  active ? "bg-leaf text-on-leaf shadow-sm" : "text-ink-soft hover:text-ink",
                )}
              >
                {pick(entry.label)}
              </Link>
            );
          })}
        </nav>
      </div>

      <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight tracking-[-0.035em] text-ink sm:text-[42px]">
        {pick(doc.title)}
      </h1>
      <p className="mt-3 text-sm font-medium text-ink-soft">{pick(LEGAL_UPDATED)}</p>
      <p className="mt-6 text-base leading-8 text-ink-soft">{pick(doc.intro)}</p>

      {/* Đóng sẵn. Mở sẵn thì 18 mục đẩy phần nội dung xuống quá nửa màn hình
          điện thoại trước khi người đọc chạm tới mục 1. */}
      <details className="group mt-8 overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface-soft">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
          <span>
            {tr("Mục lục", "Contents")}
            <span className="ml-2 font-medium text-ink-muted">
              {doc.sections.length} {tr("mục", "sections")}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className="shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <ol className="grid gap-0.5 border-t border-line px-2 pb-3 pt-2 sm:grid-cols-2">
          {doc.sections.map((section, index) => (
            <li key={section.heading.vi}>
              <a
                href={`#${sectionId(section.heading.vi, index)}`}
                className="block rounded-[var(--r-sm)] px-3 py-2.5 text-sm leading-6 text-ink-soft transition hover:bg-surface hover:text-leaf-strong"
              >
                {pick(section.heading)}
              </a>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-10 space-y-9">
        {doc.sections.map((section, index) => (
          // scroll-mt-28 vì Navbar là fixed — thiếu nó thì nhảy tới mục nào
          // tiêu đề mục đó cũng nằm khuất sau thanh điều hướng.
          <section key={section.heading.vi} id={sectionId(section.heading.vi, index)} className="scroll-mt-28">
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

      {/* Phần lớn người đọc trang này đang bỏ dở việc đăng ký. Đưa họ về đúng
          chỗ đó, và mời đọc nốt tài liệu còn lại vì ô đồng ý hỏi cả hai. */}
      <div className="mt-6 rounded-[var(--r-lg)] border border-line bg-surface-raised p-6">
        <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
          {tr("Đã đọc xong?", "Finished reading?")}
        </h2>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          {tr(
            `Bạn có thể quay lại hoàn tất đăng ký, hoặc đọc tiếp ${pick(other.full).toLowerCase()} — ô đồng ý khi đăng ký áp dụng cho cả hai tài liệu.`,
            `You can go back and finish signing up, or read the ${pick(other.full).toLowerCase()} — the consent box at registration covers both documents.`,
          )}
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/register" className={cn(buttonVariants({ variant: "primary" }), "w-full sm:w-auto")}>
            <UserPlus size={18} aria-hidden /> {tr("Quay lại đăng ký", "Back to sign-up")}
          </Link>
          <Link
            href={other.href}
            className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}
          >
            {tr("Đọc ", "Read the ")}
            {pick(other.full).toLowerCase()}
          </Link>
        </div>

        <a
          href="#dau-trang"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-leaf-strong"
        >
          <ArrowUp size={16} aria-hidden /> {tr("Về đầu trang", "Back to top")}
        </a>
      </div>
    </div>
  );
}
