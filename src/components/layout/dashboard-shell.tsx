"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LoaderCircle, Sprout } from "lucide-react";
import { Toaster } from "sonner";

import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { useSessionStore } from "@/store/session-store";
import { useLanguageStore } from "@/store/language-store";
import { useTr } from "@/lib/use-tr";

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
  "/dashboard/crop-plans/new": "Tạo kế hoạch trồng cây",
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
  "/dashboard/crop-plans/new": "Create crop plan",
};

const PAGE_DESCRIPTIONS_VI: Record<string, string> = {
  "/dashboard": "Theo dõi ảnh lá, các kết quả cần chú ý và việc nên làm tiếp theo.",
  "/dashboard/diagnosis": "Tải ảnh rõ để nhận gợi ý và hướng chăm sóc phù hợp.",
  "/dashboard/weather-alerts": "Theo dõi điều kiện thời tiết và nguy cơ ảnh hưởng đến cây.",
  "/dashboard/farms": "Tổ chức vị trí trồng và thông tin từng khu vực canh tác.",
  "/dashboard/input-library": "Tra cứu vật tư và lưu ý sử dụng an toàn.",
  "/dashboard/chat": "Hỏi về kết quả đã lưu hoặc các vấn đề chăm sóc cây.",
  "/dashboard/history": "Xem lại ảnh, kết quả và thay đổi của cây theo thời gian.",
  "/dashboard/pricing": "Chọn mức sử dụng phù hợp với nhu cầu theo dõi của bạn.",
  "/dashboard/profile": "Quản lý thông tin cá nhân và tùy chọn tài khoản.",
  "/dashboard/crop-plans": "Lập và theo dõi các công việc chăm sóc theo từng giai đoạn.",
  "/dashboard/crop-plans/new": "Chọn cây, vị trí và quy mô để tạo lịch chăm sóc.",
};

const PAGE_DESCRIPTIONS_EN: Record<string, string> = {
  "/dashboard": "Track leaf checks, results that need attention, and your next actions.",
  "/dashboard/diagnosis": "Upload a clear leaf image to receive guidance and next steps.",
  "/dashboard/weather-alerts": "Follow weather conditions and risks affecting your plants.",
  "/dashboard/farms": "Organize growing locations and cultivation details.",
  "/dashboard/input-library": "Review agricultural inputs and safe-use notes.",
  "/dashboard/chat": "Ask about saved results or plant care questions.",
  "/dashboard/history": "Review images, results, and plant changes over time.",
  "/dashboard/pricing": "Choose the usage level that fits your needs.",
  "/dashboard/profile": "Manage your personal details and account preferences.",
  "/dashboard/crop-plans": "Plan and track care tasks by growing stage.",
  "/dashboard/crop-plans/new": "Choose a crop, location, and scale to create a care schedule.",
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

function getPageDescription(pathname: string, lang: "vi" | "en"): string {
  const map = lang === "en" ? PAGE_DESCRIPTIONS_EN : PAGE_DESCRIPTIONS_VI;
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith("/dashboard/results")) {
    return lang === "en" ? "Review the result, supporting details, and recommended next steps." : "Xem kết luận, cơ sở gợi ý và việc nên làm tiếp theo.";
  }
  if (pathname.startsWith("/dashboard/pricing/checkout")) {
    return lang === "en"
      ? "Review the selected plan before creating a payment request."
      : "Kiểm tra gói đã chọn trước khi tạo yêu cầu thanh toán.";
  }
  if (pathname.startsWith("/dashboard/crop-plans/")) {
    return lang === "en" ? "Follow the plan and update completed care tasks." : "Theo dõi kế hoạch và cập nhật các việc chăm sóc đã hoàn thành.";
  }
  return lang === "en" ? "Your Agromind AI workspace." : "Không gian theo dõi sức khỏe cây trồng của bạn.";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { initialized, hydrate, isAuthenticated } = useSessionStore();
  const { language } = useLanguageStore();
  const tr = useTr();
  const { resolvedTheme } = useTheme();
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
  const pageDescription = getPageDescription(pathname, language);

  if (!mounted || !initialized || !isAuthenticated) {
    return (
      <div className="field-contours flex min-h-[100dvh] items-center justify-center bg-canvas px-5 text-ink">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-7 text-center shadow-lg">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-surface-soft text-leaf-strong">
            <Sprout size={23} aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-lg font-bold tracking-[-0.025em]">{tr("Đang mở không gian làm việc", "Opening your workspace")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{tr("Agromind AI đang kiểm tra phiên đăng nhập và dữ liệu của bạn.", "Agromind AI is checking your session and data.")}</p>
          <LoaderCircle className="mx-auto mt-5 h-5 w-5 animate-spin text-leaf" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <Toaster richColors position="top-center" theme={resolvedTheme === "dark" ? "dark" : "light"} closeButton />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-[100dvh] flex-col lg:pl-[252px]">
        <WorkspaceHeader
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          mobileNavOpen={mobileOpen}
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
