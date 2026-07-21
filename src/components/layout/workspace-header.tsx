"use client";

import Link from "next/link";
import { Crown, LogOut, Menu, ScanSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { normalizePlan, PLANS } from "@/lib/plans";
import { normalizeUserDisplayName } from "@/lib/user-profile";
import { useSessionStore } from "@/store/session-store";
import type { PlanTier } from "@/types";

interface WorkspaceHeaderProps {
  pageTitle: string;
  pageDescription?: string;
  onOpenMobileNav?: () => void;
}

function planBadgeVariant(plan: PlanTier) {
  if (plan === "elite") return "elite" as const;
  if (plan === "bloom") return "success" as const;
  return "muted" as const;
}

export function WorkspaceHeader({ pageTitle, pageDescription, onOpenMobileNav }: WorkspaceHeaderProps) {
  const router = useRouter();
  const { user, logout } = useSessionStore();
  const plan = normalizePlan(user?.currentPlan);
  const planInfo = PLANS[plan];
  const displayName = normalizeUserDisplayName(user?.name);
  const initials = displayName[0]?.toUpperCase() ?? "U";

  return (
    <header className="workspace-header sticky top-0 z-30 flex min-h-[72px] shrink-0 items-center px-4 sm:px-6 lg:px-8">
      <div className="flex w-full min-w-0 items-center gap-3">
        {onOpenMobileNav ? (
          <button type="button" onClick={onOpenMobileNav} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition hover:bg-surface-soft hover:text-ink lg:hidden" aria-label="Mở menu điều hướng">
            <Menu size={19} aria-hidden />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold tracking-[-0.02em] text-ink sm:text-lg">{pageTitle}</h1>
          {pageDescription ? <p className="mt-0.5 hidden truncate text-xs text-ink-soft md:block">{pageDescription}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={planBadgeVariant(plan)} className="hidden min-h-8 items-center gap-1.5 px-3 sm:inline-flex">
            <Crown size={13} aria-hidden /> {planInfo.name}
          </Badge>
          <ThemeToggle className="border border-line bg-surface" />
          <Link href="/dashboard/diagnosis" className={buttonVariants({ variant: "primary", size: "sm", className: "hidden md:inline-flex" })}>
            <ScanSearch size={16} aria-hidden /> Kiểm tra ảnh mới
          </Link>
          <Link href="/dashboard/profile" className="flex h-10 min-w-10 items-center gap-2 rounded-xl border border-line bg-surface px-1.5 pr-2.5 transition hover:bg-surface-soft" aria-label="Mở hồ sơ người dùng">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-soft text-xs font-bold text-leaf-strong">{initials}</span>
            <span className="hidden max-w-[140px] truncate text-xs font-semibold text-ink xl:block">{displayName}</span>
          </Link>
          <button type="button" onClick={() => { logout(); router.push("/login"); }} className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-danger/10 hover:text-danger" aria-label="Đăng xuất">
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
