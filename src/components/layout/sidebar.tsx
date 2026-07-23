"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, CloudSun, CreditCard, History, LayoutDashboard, MessageSquareText, ScanSearch, Sprout, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/logo";
import { dashboardNavGroups } from "@/constants/navigation";
import { cn } from "@/lib/utils";

const iconByHref = {
  "/dashboard": LayoutDashboard,
  "/dashboard/diagnosis": ScanSearch,
  "/dashboard/history": History,
  "/dashboard/farms": Sprout,
  "/dashboard/weather-alerts": CloudSun,
  "/dashboard/crop-plans": CalendarDays,
  "/dashboard/chat": MessageSquareText,
  "/dashboard/input-library": BookOpen,
  "/dashboard/pricing": CreditCard,
  "/dashboard/profile": UserRound,
};

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [desktop, setDesktop] = useState(false);
  const hiddenFromAssistiveTech = !desktop && !mobileOpen;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setDesktop(media.matches);

    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      document.getElementById("workspace-mobile-nav-trigger")?.focus();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onClose]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-forest/55 backdrop-blur-sm transition lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        id="workspace-sidebar"
        aria-hidden={hiddenFromAssistiveTech}
        inert={hiddenFromAssistiveTech}
        className={cn("fixed left-0 top-0 z-50 flex h-[100dvh] w-[252px] flex-col border-r border-line bg-surface px-3 py-4 text-ink shadow-lg transition-transform duration-260 lg:translate-x-0 lg:shadow-none", mobileOpen ? "translate-x-0" : "-translate-x-full")}
      >
        <div className="flex items-center justify-between gap-3 px-2">
          <Logo href="/dashboard" showTagline={false} />
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-surface-soft hover:text-ink lg:hidden" aria-label="Đóng menu">
            <X size={19} aria-hidden />
          </button>
        </div>

        <nav className="mt-7 flex-1 space-y-6 overflow-y-auto px-1 pb-4" aria-label="Điều hướng chính">
          {dashboardNavGroups.map((group) => (
            <div key={group.group}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = iconByHref[item.href as keyof typeof iconByHref] ?? Sprout;
                  const active = item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose} className={cn("group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35", active ? "bg-gradient-to-r from-leaf/14 via-surface-soft to-surface-soft text-leaf-strong" : "text-ink-soft hover:bg-surface-soft hover:text-ink")}>
                      {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-leaf" aria-hidden /> : null}
                      <Icon size={18} strokeWidth={1.8} className={cn("shrink-0 transition-transform duration-180 ease-out", !active && "group-hover:translate-x-0.5 group-hover:scale-105")} aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
