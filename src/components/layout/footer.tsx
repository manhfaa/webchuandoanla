import Link from "next/link";

import { brand } from "@/constants/brand";
import { landingNavItems } from "@/constants/navigation";

import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[36px] bg-[#10231c] px-6 py-8 text-white shadow-float sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo dark />
            <p className="max-w-md text-sm leading-7 text-emerald-50/75">
              {brand.description}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Link nhanh
            </h3>
            {landingNavItems.map((item) => (
              <a key={item.href} href={item.href} className="block text-sm text-emerald-50/75 transition hover:text-white">
                {item.label}
              </a>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Liên hệ
            </h3>
            <p className="text-sm text-emerald-50/75">hello@agromindai.vn</p>
            <p className="text-sm text-emerald-50/75">028 7300 2040</p>
            <p className="text-sm text-emerald-50/75">Khu công nghệ nông nghiệp, TP.HCM</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Mạng xã hội
            </h3>
            <Link href="/" className="block text-sm text-emerald-50/75 transition hover:text-white">
              Facebook
            </Link>
            <Link href="/" className="block text-sm text-emerald-50/75 transition hover:text-white">
              Zalo OA
            </Link>
            <Link href="/" className="block text-sm text-emerald-50/75 transition hover:text-white">
              LinkedIn
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-4 text-sm text-emerald-50/60">
          Agromind AI 2026. Giao diện demo frontend cho nền tảng xác thực ảnh lá cây và tư vấn nông nghiệp bằng AI.
        </div>
      </div>
    </footer>
  );
}
