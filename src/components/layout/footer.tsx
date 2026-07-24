"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { brand } from "@/constants/brand";
import { landingNavItems } from "@/constants/navigation";
import { useTr } from "@/lib/use-tr";

import { Logo } from "./logo";

export function Footer() {
  const tr = useTr();

  return (
    <footer className="bg-canvas px-4 pb-6 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-forest px-6 py-8 text-on-forest shadow-lg sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.75fr_0.75fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-md text-sm leading-7 text-on-forest-muted">
              {tr(brand.description, "Plant health assistant that reads leaf photos and guides Vietnamese growers on what to do next.")}
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-forest-muted">{tr("Khám phá", "Explore")}</h3>
            <div className="mt-4 space-y-3">
              {landingNavItems.map((item) => (
                <a key={item.href} href={item.href} className="block text-sm font-medium text-on-forest-muted transition hover:text-on-forest">{tr(item.label, item.labelEn)}</a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-forest-muted">{tr("Tài khoản", "Account")}</h3>
            <div className="mt-4 space-y-3">
              <Link href="/login" className="block text-sm font-medium text-on-forest-muted transition hover:text-on-forest">{tr("Đăng nhập", "Log in")}</Link>
              <Link href="/register" className="block text-sm font-medium text-on-forest-muted transition hover:text-on-forest">{tr("Tạo tài khoản", "Create account")}</Link>
              <Link href="/login?next=/dashboard/diagnosis" className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-forest transition hover:text-mint">{tr("Kiểm tra ảnh lá", "Check a leaf")} <ArrowUpRight size={15} /></Link>
            </div>
          </div>

          <div className="rounded-2xl border border-on-forest/10 bg-on-forest/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-on-forest">
              <ShieldCheck size={17} aria-hidden />
              {tr("Sử dụng kết quả an toàn", "Use results safely")}
            </div>
            <p className="mt-3 text-xs leading-6 text-on-forest-muted">{tr("Agromind hỗ trợ quan sát và theo dõi. Khi cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi thêm chuyên gia nông nghiệp địa phương.", "Agromind supports observation and tracking. When a disease spreads fast or pesticides are involved, consult a local agriculture expert.")}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-on-forest/10 pt-5 text-xs text-on-forest-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Agromind AI.</span>
          <span>{tr("Trợ lý sức khỏe cây trồng dành cho người Việt.", "Plant health assistant for Vietnamese growers.")}</span>
        </div>
      </div>
    </footer>
  );
}
