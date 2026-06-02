"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import { useSessionStore } from "@/store/session-store";
import type { PlanTier } from "@/types";

interface WorkspaceHeaderProps {
  pageTitle: string;
  onOpenMobileNav?: () => void;
}

function planBadgeVariant(plan: PlanTier) {
  if (plan === "elite") return "elite" as const;
  if (plan === "bloom") return "success" as const;
  if (plan === "grow") return "muted" as const;
  return "muted" as const;
}

export function WorkspaceHeader({ pageTitle, onOpenMobileNav }: WorkspaceHeaderProps) {
  const router = useRouter();
  const { user, logout } = useSessionStore();
  const plan = (user?.currentPlan ?? "seed") as PlanTier;
  const planInfo = PLANS[plan];
  const initials = user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <header
      className="sticky top-0 z-50 flex h-16 shrink-0 items-center px-4 sm:px-6 lg:px-8"
      style={{
        background: "var(--bg-app)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left: hamburger + brand + page title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onOpenMobileNav ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[--r-md] border border-[--border] text-[--text-muted] transition-colors hover:text-[--text-default] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40 lg:hidden"
            aria-label="Mở menu điều hướng"
          >
            <Menu size={16} strokeWidth={1.75} />
          </button>
        ) : null}

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[--text-muted]">
            Agromind AI
          </p>
          <h1 className="truncate text-[15px] font-semibold leading-tight text-[--text-strong]">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: plan badge + upgrade + avatar */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Online dot + plan — gom làm 1 badge */}
        <Badge variant={planBadgeVariant(plan)} className="hidden items-center gap-1.5 sm:inline-flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf-500" />
          {planInfo.icon} {planInfo.name}
        </Badge>

        {/* Upgrade link — ẩn khi đang ở gói elite */}
        {plan !== "elite" ? (
          <Link
            href="/dashboard/pricing"
            className="hidden items-center gap-1 rounded-[--r-md] border border-[--border-medium] px-3 py-1.5 text-xs font-medium text-[--text-default] transition-colors hover:bg-[--bg-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40 sm:flex"
          >
            Nâng cấp
          </Link>
        ) : null}

        {/* Avatar dropdown */}
        <div className="flex items-center gap-2 rounded-[--r-md] border border-[--border] px-2 py-1">
          <Link href="/dashboard/profile" aria-label="Hồ sơ">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[--bg-surface-2] border border-[--border-medium] text-xs font-semibold text-[--text-muted] select-none">
              {initials}
            </div>
          </Link>
          <p className="hidden max-w-[120px] truncate text-[13px] font-medium text-[--text-default] sm:block">
            {user?.name ?? "Người dùng"}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="rounded-[--r-sm] px-2 py-0.5 text-[11px] font-semibold text-[--text-muted] transition-colors hover:bg-white/5 hover:text-[--text-default] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-leaf-500/40"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
