"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Xác thực ảnh", href: "/dashboard/diagnosis", icon: ScanSearch },
  { label: "Kế hoạch trồng cây", href: "/dashboard/crop-plans", icon: CalendarDays },
  { label: "Chat tư vấn", href: "/dashboard/chat", icon: MessageSquareText },
  { label: "Lịch sử", href: "/dashboard/history", icon: ShieldCheck },
  { label: "Gói dịch vụ", href: "/dashboard/pricing", icon: CreditCard },
  { label: "Hồ sơ", href: "/dashboard/profile", icon: UserRound },
];

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const widthClass = collapsed ? "lg:w-[72px]" : "lg:w-[240px]";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-leaf-950/60 transition lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border-dark bg-app-surface p-4 text-on-dark transition-[width,transform] duration-200 ease-out lg:translate-x-0",
          widthClass,
          mobileOpen ? "w-[240px] translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Logo dark compact={collapsed} href="/dashboard" className="min-w-0" />
          <button
            type="button"
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-dark text-muted-on-dark transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40 lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronRight strokeWidth={1.75} className="h-4 w-4" /> : <ChevronLeft strokeWidth={1.75} className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-border-dark bg-app-surface-2 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-leaf-500/20 text-leaf-200">
              <Sparkles strokeWidth={1.75} className="h-4 w-4" />
            </div>
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <p className="text-overline text-muted-on-dark">Lịch thông minh</p>
              <p className="mt-0.5 text-body-sm font-semibold leading-snug text-on-dark">
                Chăm cây theo địa điểm và thời tiết
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40",
                  active
                    ? "bg-leaf-500 text-white shadow-sm"
                    : "text-muted-on-dark hover:bg-white/5 hover:text-on-dark",
                  collapsed && "lg:justify-center lg:px-2",
                )}
              >
                <Icon strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className={cn("truncate", collapsed && "lg:sr-only")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={cn("mt-4 rounded-lg border border-border-dark bg-app-surface-2 p-4", collapsed && "lg:hidden")}>
          <p className="text-overline text-muted-on-dark">Agromind AI Planner</p>
          <p className="mt-2 text-body-sm leading-relaxed text-muted-on-dark">
            Theo dõi từng việc cần làm cho vụ trồng — nhắc việc đúng lúc.
          </p>
        </div>
      </aside>
    </>
  );
}
