"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { brand, DEVELOPER } from "@/constants/brand";
import { landingNavItems } from "@/constants/navigation";
import { useTr } from "@/lib/use-tr";

import { Logo } from "./logo";

function Column({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{heading}</h3>
      <div className="mt-4 flex flex-col">{children}</div>
    </div>
  );
}

const linkClass = "inline-flex min-h-9 items-center text-sm text-ink-soft transition hover:text-ink";

/**
 * A corporate footer on the page's own canvas, closed by a hairline and one
 * line of imprint. The company is named as the developer and nothing else is
 * shown — no address, phone or registration number has been supplied, and a
 * footer that invents them is worse than one that stays quiet.
 */
export function Footer() {
  const tr = useTr();

  return (
    <footer className="border-t border-line bg-surface px-4 pb-8 pt-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,minmax(0,0.6fr))] lg:gap-8">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-7 text-ink-soft">
              {tr(brand.description, brand.descriptionEn)}
            </p>
            <p className="mt-6 flex items-center gap-3 text-sm font-semibold text-ink">
              <span className="h-2 w-2 bg-leaf" aria-hidden />
              {tr(`Phát triển bởi ${DEVELOPER}`, `Developed by ${DEVELOPER}`)}
            </p>
          </div>

          <Column heading={tr("Sản phẩm", "Product")}>
            {landingNavItems.map((item) => (
              <a key={item.href} href={item.href} className={linkClass}>
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
            {/* Google found the disease pages through the sitemap alone and
                reported no referring page — a link here is how both a crawler
                and a visitor learn the pages matter. */}
            <Link href="/benh-cay" className={linkClass}>{tr("Bệnh cây trồng", "Plant diseases")}</Link>
            <Link href="/terms" className={linkClass}>{tr("Điều khoản sử dụng", "Terms of Service")}</Link>
            <Link href="/privacy" className={linkClass}>{tr("Chính sách quyền riêng tư", "Privacy Policy")}</Link>
          </Column>
        </div>

        <div className="mt-12 grid gap-4 border-t border-line pt-6 text-xs leading-6 text-ink-soft sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8">
          <p className="max-w-2xl">
            {tr(
              "Agromind hỗ trợ quan sát và theo dõi. Khi cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi thêm chuyên gia nông nghiệp địa phương.",
              "Agromind supports observation and tracking. When a disease spreads fast or pesticides are involved, consult a local agriculture expert.",
            )}
          </p>
          <p className="tabular-nums text-ink">© 2026 {DEVELOPER} · Agromind AI</p>
        </div>
      </div>
    </footer>
  );
}
