import Link from "next/link";
import { ArrowRight, CalendarRange, History, MessageSquareText, ScanSearch } from "lucide-react";

const quickLinks = [
  {
    title: "Kiểm tra ảnh lá",
    description: "Tải hoặc chụp ảnh để xác minh lá cây.",
    href: "/dashboard/diagnosis",
    icon: ScanSearch,
  },
  {
    title: "Chat tư vấn",
    description: "Hỏi AI hoặc chuyên gia nông nghiệp.",
    href: "/dashboard/chat",
    icon: MessageSquareText,
  },
  {
    title: "Lịch sử ảnh",
    description: "Xem lại các lần kiểm tra trước.",
    href: "/dashboard/history",
    icon: History,
  },
  {
    title: "Kế hoạch trồng cây",
    description: "Lịch chăm cây theo bước.",
    href: "/dashboard/crop-plans",
    icon: CalendarRange,
  },
];

export function QuickAccessPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {quickLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-[100px] flex-col justify-between rounded-lg border border-border-dark bg-app-surface p-4 text-on-dark shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-leaf-500/15 text-leaf-200">
                <Icon strokeWidth={1.75} className="h-4 w-4" aria-hidden />
              </span>
              <ArrowRight
                strokeWidth={1.75}
                className="h-4 w-4 shrink-0 text-muted-on-dark transition group-hover:translate-x-0.5 group-hover:text-on-dark"
                aria-hidden
              />
            </div>
            <div>
              <h3 className="text-h3 text-on-dark">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-body-sm text-muted-on-dark">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
