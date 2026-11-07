"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { brand, DEVELOPER } from "@/constants/brand";
import { OPEN_ANALYTICS_SETTINGS_EVENT } from "@/components/system/analytics-consent";
import { landingNavItems } from "@/constants/navigation";
import { useTr } from "@/lib/use-tr";

import { Logo } from "./logo";

/** Footer rules are #B9C7BC at 18%, per the brand sheet — not the page hairline. */
const RULE = "border-[rgba(185,199,188,0.18)]";

function Column({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-on-forest">{heading}</h3>
      <div className="mt-4 flex flex-col">{children}</div>
    </div>
  );
}

const linkClass = "inline-flex min-h-9 items-center text-sm text-on-forest-muted transition hover:text-on-forest";

/**
 * Footer on DIEPTEK ink (#14291A) with #B9C7BC text, as the brand sheet lays
 * it out. Credit the development team without inventing a registered company
 * address or legal status that has not been supplied.
 */
export function Footer() {
  const tr = useTr();

  return (
    <footer className="bg-forest px-4 pb-8 pt-14 text-on-forest-muted sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,minmax(0,0.6fr))] lg:gap-8">
          <div>
            <Logo dark />
            <p className="mt-5 max-w-sm text-sm leading-7">{tr(brand.description, brand.descriptionEn)}</p>
            <p className="mt-6 flex items-center gap-3 text-sm font-semibold leading-6 text-on-forest">
              <Image src="/logos/dieptek-mark-lime.png" alt={`${DEVELOPER} logo`} width={44} height={44} className="h-11 w-11 shrink-0 object-contain" />
              <span>{tr(`Agromind AI do nhóm ${DEVELOPER} phát triển.`, `Agromind AI is developed by the ${DEVELOPER} team.`)}</span>
            </p>
          </div>

          <Column heading={tr("Sản phẩm", "Product")}>
            {landingNavItems.map((item) => (
              <a key={item.href} href={`/${item.href}`} className={linkClass}>
                {tr(item.label, item.labelEn)}
              </a>
            ))}
            <Link href="/login?next=/dashboard/diagnosis" className={linkClass}>
              {tr("Kiểm tra ảnh lá", "Check a leaf")}
            </Link>
          </Column>

          <Column heading={tr("Tài khoản", "Account")}>
            <Link href="/login" className={linkClass}>{tr("Đăng nhập", "Log in")}</Link>
            <Link href="/register" className={linkClass}>{tr("Tạo tài khoản", "Create account")}</Link>
          </Column>

          <Column heading={tr("Tài liệu", "Resources")}>
            <Link href="/about" className={linkClass}>{tr("Về Agromind AI", "About Agromind AI")}</Link>
            {/* Google found the disease pages through the sitemap alone and
                reported no referring page — a link here is how both a crawler
                and a visitor learn the pages matter. */}
            <Link href="/benh-cay" className={linkClass}>{tr("Bệnh cây trồng", "Plant diseases")}</Link>
            <Link href="/terms" className={linkClass}>{tr("Điều khoản sử dụng", "Terms of Service")}</Link>
            <Link href="/privacy" className={linkClass}>{tr("Chính sách quyền riêng tư", "Privacy Policy")}</Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_ANALYTICS_SETTINGS_EVENT))} className={`${linkClass} text-left`}>
              {tr("Cài đặt riêng tư", "Privacy settings")}
            </button>
          </Column>

          <Column heading={tr("Hỗ trợ", "Support")}>
            <Link href="/support" className={linkClass}>{tr("Liên hệ & hỗ trợ", "Contact & support")}</Link>
            <p className="mt-2 text-xs leading-5">{tr("Dự kiến phản hồi trong 1–3 ngày làm việc.", "Expected reply within 1–3 business days.")}</p>
          </Column>
        </div>

        <div className={`mt-12 grid gap-4 border-t pt-6 text-xs leading-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8 ${RULE}`}>
          <p className="max-w-2xl">
            {tr(
              "Agromind hỗ trợ quan sát và theo dõi. Khi cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi thêm chuyên gia nông nghiệp địa phương.",
              "Agromind supports observation and tracking. When a disease spreads fast or pesticides are involved, consult a local agriculture expert.",
            )}
          </p>
          <p className="tabular-nums text-grey">© 2026 {DEVELOPER} · Agromind AI</p>
        </div>
      </div>
    </footer>
  );
}
