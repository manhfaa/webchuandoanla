"use client";

import Link from "next/link";
import { Menu, Rocket, UserCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { t } from "@/lib/i18n";
import { getPlanIcon, getPlanLabel } from "@/lib/utils";
import { useLanguageStore } from "@/store/language-store";
import { useSessionStore } from "@/store/session-store";

const titleMap: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Bảng điều khiển tổng quan",
    description: "Hoạt động gần đây, lịch sử ảnh và gói dịch vụ hiện tại.",
  },
  "/dashboard/diagnosis": {
    title: "Kiểm tra ảnh lá cây",
    description: "Tải ảnh hoặc chụp ảnh để hệ thống xác minh đây có phải lá cây hay không.",
  },
  "/dashboard/weather-alerts": {
    title: "Thời tiết & sâu bệnh",
    description: "Theo dõi dự báo, cảnh báo sâu bệnh và gợi ý thao tác theo vị trí canh tác.",
  },
  "/dashboard/farms": {
    title: "Lô vườn & QR truy xuất",
    description: "Quản lý lô vườn, nhật ký chăm sóc và trang công khai cho mã QR truy xuất.",
  },
  "/dashboard/input-library": {
    title: "Thư viện vật tư",
    description: "Tra cứu thuốc bảo vệ thực vật, phân bón và triệu chứng thiếu dinh dưỡng.",
  },
  "/dashboard/chat": {
    title: "Chat tư vấn",
    description: "Trò chuyện với AI hoặc mở kênh chuyên gia nông nghiệp khi cần hỗ trợ sâu hơn.",
  },
  "/dashboard/history": {
    title: "Lịch sử kiểm tra ảnh",
    description: "Xem lại các ảnh lá đã lưu theo thời gian.",
  },
  "/dashboard/pricing": {
    title: "Gói dịch vụ",
    description: "So sánh các gói để chọn trải nghiệm phù hợp với nhu cầu.",
  },
  "/dashboard/profile": {
    title: "Hồ sơ người dùng",
    description: "Quản lý thông tin tài khoản và gói bạn đang sử dụng.",
  },
  "/dashboard/crop-plans": {
    title: "Kế hoạch trồng cây",
    description: "Theo dõi kế hoạch chăm cây theo địa điểm, thời tiết và tiến độ thực hiện.",
  },
};

const titleMapEn: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard overview",
    description: "Recent activity, diagnosis history and the current subscription plan.",
  },
  "/dashboard/diagnosis": {
    title: "Leaf image check",
    description: "Upload or capture a leaf image for validation and CNN diagnosis.",
  },
  "/dashboard/weather-alerts": {
    title: "Weather & pest alerts",
    description: "Track forecast, pest warnings and field actions by cultivation location.",
  },
  "/dashboard/farms": {
    title: "Farms, logs & QR",
    description: "Manage plots, cultivation logs and public QR traceability pages.",
  },
  "/dashboard/input-library": {
    title: "Input library",
    description: "Search pesticides, fertilizers and nutrition deficiency symptoms.",
  },
  "/dashboard/chat": {
    title: "Advisory chat",
    description: "Chat with AI or use the expert agriculture channel for deeper support.",
  },
  "/dashboard/history": {
    title: "Image check history",
    description: "Review saved leaf image checks over time.",
  },
  "/dashboard/pricing": {
    title: "Plans",
    description: "Compare plans and choose the experience that fits your needs.",
  },
  "/dashboard/profile": {
    title: "User profile",
    description: "Manage account details and the plan you are using.",
  },
  "/dashboard/crop-plans": {
    title: "Crop plans",
    description: "Track crop care plans by location, weather and execution progress.",
  },
};

const checkoutMeta = {
  title: "Thanh toán nâng cấp gói",
  description: "Điền thông tin và xác nhận để hệ thống đối soát giao dịch.",
};

export function DashboardTopbar({
  onOpenUpgrade,
  onOpenMobileNav,
}: {
  onOpenUpgrade: () => void;
  onOpenMobileNav: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useSessionStore();
  const { language } = useLanguageStore();
  const online = useOnlineStatus();
  const activeTitleMap = language === "en" ? titleMapEn : titleMap;
  const localizedCheckoutMeta =
    language === "en"
      ? {
          title: "Plan upgrade checkout",
          description: "Enter details and confirm so the system can reconcile the transaction.",
        }
      : checkoutMeta;

  const pageMeta =
    pathname.startsWith("/dashboard/pricing/checkout")
      ? localizedCheckoutMeta
      : (activeTitleMap[pathname] ??
        (pathname.startsWith("/dashboard/results")
          ? {
              title: language === "en" ? "Image check result" : "Kết quả kiểm tra ảnh",
              description:
                language === "en"
                  ? "Review the checked image and recommended next steps."
                  : "Xem lại ảnh đã kiểm tra và các gợi ý tiếp theo.",
            }
          : pathname.startsWith("/dashboard/crop-plans/")
            ? {
                title: language === "en" ? "Crop plan details" : "Chi tiết kế hoạch trồng cây",
                description:
                  language === "en"
                    ? "Open each step, review the schedule and update crop care progress."
                    : "Mở từng bước cần làm, xem lịch và cập nhật tiến độ chăm cây.",
              }
            : activeTitleMap["/dashboard"]));

  return (
    <header className="workspace-header sticky top-0 z-50 flex min-h-[72px] shrink-0 border-b border-border-dark bg-app backdrop-blur-md lg:h-[72px] lg:overflow-hidden">
      <div className="flex w-full min-w-0 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex lg:h-[72px] lg:flex-row lg:items-center lg:gap-4 lg:py-0 lg:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center">
          <Button
            type="button"
            variant="outline"
            size="iconSm"
            className="mt-0.5 shrink-0 border-border-dark lg:hidden"
            aria-label="Mở menu điều hướng"
            onClick={onOpenMobileNav}
          >
            <Menu strokeWidth={1.75} className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-overline text-muted-on-dark">Không gian làm việc Agromind AI</p>
            <h1
              className="mt-0.5 truncate text-xl font-semibold tracking-tight text-on-dark-strong sm:text-h3"
              aria-describedby="dashboard-page-desc"
            >
              {pageMeta.title}
            </h1>
            <p id="dashboard-page-desc" className="sr-only">
              {pageMeta.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end lg:ml-auto">
          <LanguageToggle />
          <Badge variant={online ? "success" : "warning"}>
            {t(language, online ? "status.online" : "status.offline")}
          </Badge>
          <Badge variant="dark" className="no-underline">
            {getPlanIcon(user?.currentPlan ?? "seed")} Gói {getPlanLabel(user?.currentPlan ?? "seed")}
          </Badge>
          <Button variant="secondary" size="sm" onClick={onOpenUpgrade}>
            <Rocket strokeWidth={1.75} className="h-4 w-4" />
            Nâng cấp
          </Button>
          <Link
            href="/dashboard/pricing"
            className="no-underline inline-flex h-8 items-center justify-center rounded-md border border-border-dark px-3 text-body-sm font-medium text-on-dark transition duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
          >
            Xem gói
          </Link>
          <div className="ml-1 flex items-center gap-2 rounded-md border border-border-dark bg-app-surface-2 px-2 py-1">
            <UserCircle2 strokeWidth={1.75} className="h-5 w-5 shrink-0 text-muted-on-dark" aria-hidden />
            <div className="max-w-[160px] text-left sm:max-w-[200px] xl:block">
              <p className="truncate text-body-sm font-semibold text-on-dark-strong">
                {user?.name ?? "Người dùng Agromind AI"}
              </p>
              <p className="truncate text-caption text-muted-on-dark">{user?.email ?? "Chưa đăng nhập"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-md border border-border-dark px-2 py-1 text-caption font-semibold text-muted-on-dark transition hover:bg-white/5 hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
