"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";

import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStore } from "@/store/session-store";
import { useLanguageStore } from "@/store/language-store";

import { Sidebar } from "./sidebar";
import { WorkspaceHeader } from "./workspace-header";

const PAGE_TITLES_VI: Record<string, string> = {
  "/dashboard":                "Bảng điều khiển",
  "/dashboard/diagnosis":      "Kiểm tra ảnh lá cây",
  "/dashboard/weather-alerts": "Thời tiết & sâu bệnh",
  "/dashboard/farms":          "Lô vườn & QR truy xuất",
  "/dashboard/input-library":  "Thư viện vật tư",
  "/dashboard/chat":           "Chat tư vấn",
  "/dashboard/history":        "Lịch sử kiểm tra",
  "/dashboard/pricing":        "Gói dịch vụ",
  "/dashboard/profile":        "Hồ sơ người dùng",
  "/dashboard/crop-plans":     "Kế hoạch trồng cây",
};

const PAGE_TITLES_EN: Record<string, string> = {
  "/dashboard":                "Dashboard",
  "/dashboard/diagnosis":      "Leaf image check",
  "/dashboard/weather-alerts": "Weather & pest alerts",
  "/dashboard/farms":          "Farms & QR traceability",
  "/dashboard/input-library":  "Input library",
  "/dashboard/chat":           "Advisory chat",
  "/dashboard/history":        "Image check history",
  "/dashboard/pricing":        "Plans",
  "/dashboard/profile":        "User profile",
  "/dashboard/crop-plans":     "Crop plans",
};

function getPageTitle(pathname: string, lang: "vi" | "en"): string {
  const map = lang === "en" ? PAGE_TITLES_EN : PAGE_TITLES_VI;
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith("/dashboard/pricing/checkout")) {
    return lang === "en" ? "Plan upgrade checkout" : "Thanh toán nâng cấp gói";
  }
  if (pathname.startsWith("/dashboard/results")) {
    return lang === "en" ? "Image check result" : "Kết quả kiểm tra ảnh";
  }
  if (pathname.startsWith("/dashboard/crop-plans/")) {
    return lang === "en" ? "Crop plan details" : "Chi tiết kế hoạch trồng cây";
  }
  return "Agromind AI";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { initialized, hydrate, isAuthenticated } = useSessionStore();
  const { language } = useLanguageStore();
  const pathname = usePathname();
  const router = useRouter();
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

  useEffect(() => {
    if (!mounted || !initialized || isAuthenticated) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [initialized, isAuthenticated, mounted, pathname, router]);

  const pageTitle = getPageTitle(pathname, language);

  if (!mounted || !initialized || !isAuthenticated) {
    return (
      <div className="dark theme-dashboard min-h-screen bg-dashboard-mesh px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Skeleton className="hidden h-[calc(100vh-3rem)] rounded-lg lg:block" />
          <div className="space-y-6">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="min-h-[60vh] rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark theme-dashboard min-h-screen bg-dashboard-mesh text-[--text-default]">
      <Toaster richColors position="top-center" theme="dark" closeButton />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-[240px]">
        <WorkspaceHeader
          pageTitle={pageTitle}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main
          id="main-content"
          className="page-content relative z-0 flex-1 scroll-mt-[80px] px-4 pb-10 pt-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
