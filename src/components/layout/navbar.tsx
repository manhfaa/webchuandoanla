"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { brand } from "@/constants/brand";
import { landingNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between rounded-full border border-white/70 bg-white/80 px-4 py-3 shadow-soft backdrop-blur-xl">
          <Logo />

          <nav className="hidden items-center gap-6 lg:flex">
            {landingNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-brand-700"
              >
                {item.label}
              </a>
            ))}

            <Link
              href="/login?next=/dashboard"
              className="text-sm font-medium text-slate-700 transition hover:text-brand-700"
            >
              Dashboard
            </Link>

            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 transition hover:text-brand-700"
            >
              Đăng nhập
            </Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {brand.slogan}
            </span>
            <Link href="/login" className={buttonVariants({ variant: "primary" })}>
              Dùng thử ngay
            </Link>
          </div>

          <Button
            variant="ghost"
            size="iconSm"
            className="lg:hidden"
            type="button"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>

        {open ? (
          <div className="mt-3 rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-soft backdrop-blur lg:hidden">
            <div className="flex flex-col gap-3">
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-brand-700"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <Link
                href="/login?next=/dashboard"
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-brand-700"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>

              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "primary" }), "w-full")}
                onClick={() => setOpen(false)}
              >
                Dùng thử ngay
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
