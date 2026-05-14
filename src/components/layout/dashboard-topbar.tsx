"use client";

import Link from "next/link";
import { Menu, Rocket, UserCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlanLabel } from "@/lib/utils";
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

  const pageMeta =
    pathname.startsWith("/dashboard/pricing/checkout")
      ? checkoutMeta
      : (titleMap[pathname] ??
        (pathname.startsWith("/dashboard/results")
          ? {
              title: "Kết quả kiểm tra ảnh",
              description: "Xem lại ảnh đã kiểm tra và các gợi ý tiếp theo.",
            }
          : pathname.startsWith("/dashboard/crop-plans/")
            ? {
                title: "Chi tiết kế hoạch trồng cây",
                description: "Mở từng bước cần làm, xem lịch và cập nhật tiến độ chăm cây.",
              }
            : titleMap["/dashboard"]));

  return (
    <header className="workspace-header sticky top-0 z-50 flex min-h-[72px] shrink-0 border-b border-border-dark bg-app backdrop-blur-md">
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
            <p className="text-overline text-muted-on-dark">Agromind AI workspace</p>
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
          <Badge variant="dark" className="no-underline">
            Gói {getPlanLabel(user?.currentPlan ?? "free")}
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
              <p className="truncate text-caption text-muted-on-dark">{user?.email ?? "demo@agromindai.vn"}</p>
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
