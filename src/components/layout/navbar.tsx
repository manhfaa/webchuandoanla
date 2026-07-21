"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { landingNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

import { Logo } from "./logo";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-14 items-center justify-between rounded-2xl border border-line bg-surface/90 px-3 shadow-sm backdrop-blur-xl md:h-16 md:px-4">
          <Logo showTagline={false} />

          <nav className="hidden items-center gap-6 lg:flex">
            {landingNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-soft transition hover:text-leaf-strong"
              >
                {item.label}
              </a>
            ))}

            <Link
              href="/login"
              className="text-sm font-medium text-ink transition hover:text-leaf-strong"
            >
              Đăng nhập
            </Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
              <Link href="/login?next=/dashboard/diagnosis" className={buttonVariants({ variant: "primary" })}>
              Kiểm tra lá
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="iconSm"
              type="button"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {open ? (
          <div className="mt-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-sm backdrop-blur-xl lg:hidden">
            <div className="flex flex-col gap-3">
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-soft hover:text-leaf-strong"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-soft hover:text-leaf-strong"
                onClick={() => setOpen(false)}
              >
                Đăng nhập
              </Link>

              <Link
                href="/login?next=/dashboard/diagnosis"
                className={cn(buttonVariants({ variant: "primary" }), "w-full mt-2")}
                onClick={() => setOpen(false)}
              >
                Kiểm tra lá
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
