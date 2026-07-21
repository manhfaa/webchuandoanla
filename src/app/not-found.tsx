import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="field-contours flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-xl rounded-xl border border-line bg-surface-raised p-10 text-center shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
          Trang bạn tìm không tồn tại
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          Bạn có thể quay lại trang chủ hoặc đăng nhập để mở bảng điều khiển Agromind AI.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Về trang chủ
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
            Đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
