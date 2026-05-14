import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-xl rounded-[36px] border border-white/70 bg-white/90 p-10 text-center shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">
          404
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
          Trang bạn tìm không tồn tại trong demo Agromind AI
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Bạn có thể quay lại landing page hoặc vào thẳng dashboard sau khi đăng nhập demo.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Về trang chủ
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
            Đăng nhập demo
          </Link>
        </div>
      </div>
    </main>
  );
}
