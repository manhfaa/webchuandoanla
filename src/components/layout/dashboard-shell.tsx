"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStore } from "@/store/session-store";

import { DashboardTopbar } from "./dashboard-topbar";
import { Sidebar } from "./sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { initialized, hydrate } = useSessionStore();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      void hydrate();
    }
  }, [hydrate, mounted]);

  if (!mounted || !initialized) {
    return (
      <div className="dark theme-dashboard min-h-screen bg-dashboard-mesh px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Skeleton className="hidden h-[calc(100vh-3rem)] rounded-lg lg:block" />
          <div className="space-y-6">
            <Skeleton className="h-[72px] rounded-lg" />
            <Skeleton className="min-h-[60vh] rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark theme-dashboard min-h-screen bg-dashboard-mesh text-on-dark">
      <Toaster richColors position="top-center" theme="dark" closeButton />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-[240px]">
        <DashboardTopbar
          onOpenUpgrade={() => setUpgradeOpen(true)}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main
          id="main-content"
          className="page-content relative z-0 flex-1 scroll-mt-[88px] px-4 pb-8 pt-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
