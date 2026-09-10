"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { landingNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/use-tr";
import { LanguageToggle } from "@/components/layout/language-toggle";

import { Logo } from "./logo";

/**
 * Full-width bar with a hairline under it. The previous floating pill with a
 * glowing gradient rule was the single strongest "generated" tell on the page;
 * every real agri-tech site — Plantix, Taranis, Cropin — runs a flat bar edge to
 * edge. Height is 64px, so section scroll offsets of 68/76px still clear it.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const tr = useTr();

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <Logo showTagline={false} />

        <nav className="hidden items-center gap-7 lg:flex" aria-label={tr("Điều hướng trang", "Site navigation")}>
          {landingNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative py-1 text-sm font-medium text-ink-soft transition hover:text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-180 hover:after:scale-x-100"
            >
              {tr(item.label, item.labelEn)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle />
          <span className="mx-1 h-6 w-px bg-line" aria-hidden />
          <Link href="/login" className="text-sm font-semibold text-ink transition hover:text-leaf-strong">
            {tr("Đăng nhập", "Log in")}
          </Link>
          <Link href="/login?next=/dashboard/diagnosis" className={cn(buttonVariants({ variant: "primary" }), "chlorophyll-button")}>
            {tr("Kiểm tra lá", "Check a leaf")}
          </Link>
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <LanguageToggle />
          <Button
            variant="ghost"
            size="iconSm"
            type="button"
            aria-label={open ? tr("Đóng menu", "Close menu") : tr("Mở menu", "Open menu")}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {open ? (
        <div id="mobile-navigation" className="border-t border-line bg-surface px-4 py-3 sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            {landingNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border-b border-line py-3.5 text-sm font-medium text-ink transition hover:text-leaf-strong"
                onClick={() => setOpen(false)}
              >
                {tr(item.label, item.labelEn)}
              </a>
            ))}

            <Link
              href="/login"
              className="border-b border-line py-3.5 text-sm font-medium text-ink transition hover:text-leaf-strong"
              onClick={() => setOpen(false)}
            >
              {tr("Đăng nhập", "Log in")}
            </Link>

            <Link
              href="/login?next=/dashboard/diagnosis"
              className={cn(buttonVariants({ variant: "primary" }), "mt-4 w-full")}
              onClick={() => setOpen(false)}
            >
              {tr("Kiểm tra lá", "Check a leaf")}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
