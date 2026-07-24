"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";

export default function NotFound() {
  const tr = useTr();
  return (
    <main className="field-contours flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      <div className="max-w-xl rounded-xl border border-line bg-surface-raised p-10 text-center shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
          {tr("Trang bạn tìm không tồn tại", "The page you are looking for does not exist")}
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          {tr("Bạn có thể quay lại trang chủ hoặc đăng nhập để mở bảng điều khiển Agromind AI.", "You can go back to the home page or sign in to open the Agromind AI dashboard.")}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            {tr("Về trang chủ", "Back to home")}
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
            {tr("Đăng nhập", "Sign in")}
          </Link>
        </div>
      </div>
    </main>
  );
}
