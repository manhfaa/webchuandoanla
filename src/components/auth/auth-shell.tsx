import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Leaf, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideDescription: string;
  children: React.ReactNode;
}

export function AuthShell({ eyebrow, title, description, asideTitle, asideDescription, children }: AuthShellProps) {
  return (
    <main id="main-content" className="field-contours min-h-[100dvh] bg-canvas px-4 py-4 text-ink sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[var(--r-xl)] border border-line bg-surface shadow-lg sm:min-h-[calc(100dvh-3rem)] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-forest p-9 text-on-forest lg:flex lg:flex-col lg:justify-between xl:p-12">
          <Image
            src="/plant-leaves/agromind-auth-leaf.png"
            alt=""
            fill
            priority
            loading="eager"
            sizes="45vw"
            className="object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest/68 via-forest/58 to-forest/88" aria-hidden />
          <div className="relative"><Logo dark showTagline={false} /></div>

          <div className="relative max-w-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-on-forest/10 text-on-forest">
              <Leaf size={23} aria-hidden />
            </span>
            <h2 className="mt-6 font-display text-[38px] font-bold leading-[1.12] tracking-[-0.035em] text-on-forest">{asideTitle}</h2>
            <p className="mt-5 text-base font-medium leading-8 text-on-forest-muted">{asideDescription}</p>
          </div>

          <div className="relative flex items-start gap-3 border-t border-on-forest/10 pt-6 text-sm leading-6 text-on-forest-muted">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-on-forest" aria-hidden />
            <p>Kết quả AI mang tính tham khảo. Khi cây bệnh lan nhanh hoặc cần dùng thuốc, hãy hỏi thêm chuyên gia nông nghiệp địa phương.</p>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col p-5 sm:p-8 lg:p-10 xl:p-14">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <Logo showTagline={false} />
            </div>
            <Link href="/" className="hidden min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-soft transition hover:bg-surface-soft hover:text-ink sm:inline-flex">
              <ArrowLeft size={16} aria-hidden /> Quay lại trang chủ
            </Link>
            <ThemeToggle className="border border-line bg-surface" />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <p className="text-overline text-leaf-strong">{eyebrow}</p>
            <h1 className="mt-3 font-display text-[32px] font-bold leading-[1.16] tracking-[-0.035em] text-ink sm:text-[38px]">{title}</h1>
            <p className="mt-4 text-sm font-medium leading-7 text-ink-soft">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
