"use client";

import Link from "next/link";
import { Leaf, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { landingNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/use-tr";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";

import { Logo } from "./logo";

/* V2 — NAVBAR
   Sửa: bỏ pill nổi bo 16px -> bar full-width có hairline dưới (không còn cảm
        giác "widget" trôi trên hero), thêm trạng thái scroll làm rõ nền,
        mobile sheet có focus trap + khóa cuộn body + trả focus về nút mở.
   Giữ: landingNavItems, LanguageToggle, ThemeToggle, Logo, mọi route. */

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const tr = useTr();
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Focus trap + Escape + body scroll lock cho mobile sheet.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const sheet = sheetRef.current;
    const focusables = sheet
      ? Array.from(
          sheet.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled ? "border-line-strong bg-surface/96" : "border-line bg-surface/86",
        "backdrop-blur-xl",
      )}
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center justify-between transition-[height] duration-200",
            scrolled ? "h-14 md:h-[60px]" : "h-14 md:h-16",
          )}
        >
          <Logo showTagline={false} />

          <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
            {landingNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-soft transition hover:text-leaf-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {tr(item.label, item.labelEn)}
              </a>
            ))}

            <Link
              href="/login"
              className="text-sm font-semibold text-ink transition hover:text-leaf-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {tr("Đăng nhập", "Log in")}
            </Link>
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/login?next=/dashboard/diagnosis"
              className={cn(buttonVariants({ variant: "primary" }), "chlorophyll-button")}
            >
              <Leaf size={16} aria-hidden />
              {tr("Kiểm tra lá", "Check a leaf")}
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageToggle />
            <ThemeToggle />
            <button
              ref={triggerRef}
              type="button"
              className={buttonVariants({ variant: "ghost", size: "iconSm" })}
              aria-label={open ? tr("Đóng menu", "Close menu") : tr("Mở menu", "Open menu")}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen((current) => !current)}
            >
              {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 top-14 z-40 bg-forest/60 lg:hidden"
            aria-hidden
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
          <div
            ref={sheetRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Điều hướng", "Navigation")}
            className="fixed inset-x-0 top-14 z-50 border-b border-line bg-surface px-5 pb-6 pt-4 shadow-lg lg:hidden"
          >
            <div className="flex flex-col">
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[48px] items-center border-b border-paper-rule text-[15px] font-medium text-ink transition hover:text-leaf-strong"
                  onClick={() => setOpen(false)}
                >
                  {tr(item.label, item.labelEn)}
                </a>
              ))}

              <Link
                href="/login"
                className="flex min-h-[48px] items-center border-b border-paper-rule text-[15px] font-semibold text-ink transition hover:text-leaf-strong"
                onClick={() => setOpen(false)}
              >
                {tr("Đăng nhập", "Log in")}
              </Link>

              <Link
                href="/login?next=/dashboard/diagnosis"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-5 w-full")}
                onClick={() => setOpen(false)}
              >
                <Leaf size={16} aria-hidden />
                {tr("Kiểm tra lá", "Check a leaf")}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
