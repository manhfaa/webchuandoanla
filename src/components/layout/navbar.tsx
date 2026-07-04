"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { landingNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";

export function Navbar({
  theme = "light",
  onToggleTheme,
}: {
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isDark = theme === "dark";

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-2 sm:px-5 sm:pt-3 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between rounded-full border border-white/75 bg-white/80 px-3 py-2 shadow-[0_12px_34px_rgba(17,64,42,0.11)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#071d13]/80 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:px-4">
          <Logo dense dark={isDark} />

          <nav className="hidden items-center gap-4 lg:flex">
            {landingNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs font-semibold text-slate-600 transition hover:text-brand-700 dark:text-emerald-50/75 dark:hover:text-lime-200 xl:text-sm"
              >
                {item.label}
              </a>
            ))}

            <Link
              href="/login?next=/dashboard"
              className="text-xs font-semibold text-slate-700 transition hover:text-brand-700 dark:text-emerald-50/80 dark:hover:text-lime-200 xl:text-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 transition hover:text-brand-700 dark:text-emerald-50/80 dark:hover:text-lime-200 xl:text-sm"
            >
              Đăng nhập
            </Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button
              variant="ghost"
              size="iconSm"
              type="button"
              aria-label={isDark ? "Bật giao diện sáng" : "Bật giao diện tối"}
              onClick={onToggleTheme}
              className="h-9 w-9 rounded-full border border-leaf-100 bg-white/75 text-leaf-800 hover:bg-leaf-50 dark:border-white/10 dark:bg-white/10 dark:text-lime-100 dark:hover:bg-white/20"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Link
              href="/login?next=/dashboard/diagnosis"
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "h-9 rounded-full px-4")}
            >
              Chẩn đoán
            </Link>
          </div>

          <Button
            variant="ghost"
            size="iconSm"
            className="h-9 w-9 rounded-full border border-leaf-100 bg-white/70 text-leaf-800 dark:border-white/10 dark:bg-white/10 dark:text-lime-100 lg:hidden"
            type="button"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>

        {open ? (
          <div className="mt-3 rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-[#071d13]/96 lg:hidden">
            <div className="flex flex-col gap-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onToggleTheme}
                className="justify-start rounded-2xl px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-brand-700 dark:text-emerald-50/80 dark:hover:bg-white/10 dark:hover:text-lime-200"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                {isDark ? "Bật giao diện sáng" : "Bật giao diện tối"}
              </Button>
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-brand-700 dark:text-emerald-50/80 dark:hover:bg-white/10 dark:hover:text-lime-200"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <Link
                href="/login?next=/dashboard"
                className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-brand-700 dark:text-emerald-50/80 dark:hover:bg-white/10 dark:hover:text-lime-200"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>

              <Link
                href="/login?next=/dashboard/diagnosis"
                className={cn(buttonVariants({ variant: "primary" }), "w-full")}
                onClick={() => setOpen(false)}
              >
                Chẩn đoán ngay
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
