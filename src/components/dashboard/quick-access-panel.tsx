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
    <section>
      <div className="mb-4">
        <p className="text-overline text-leaf-strong">Thao tác nhanh</p>
        <h2 className="mt-2 text-h2 font-bold text-ink">Bạn muốn làm gì tiếp theo?</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {quickLinks.map((item) => {
        const Icon = item.icon;
        const featured = item.href === "/dashboard/diagnosis";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex min-h-[152px] flex-col justify-between rounded-lg border p-5 shadow-sm transition duration-180 ease-out hover:-translate-y-[3px] hover:border-leaf/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35 ${featured ? "border-transparent bg-forest text-on-forest" : "border-line bg-surface text-ink"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-md ${featured ? "bg-on-forest/10 text-on-forest" : "bg-surface-soft text-leaf-strong"}`}>
                <Icon strokeWidth={1.8} className="h-5 w-5" aria-hidden />
              </span>
              <ArrowRight
                strokeWidth={1.75}
                className={`h-4 w-4 shrink-0 transition group-hover:translate-x-1 ${featured ? "text-on-forest-muted group-hover:text-on-forest" : "text-ink-soft group-hover:text-leaf-strong"}`}
                aria-hidden
              />
            </div>
            <div>
              <h3 className={`text-h3 font-bold ${featured ? "text-on-forest" : "text-ink"}`}>{item.title}</h3>
              <p className={`mt-1 line-clamp-2 text-body-sm ${featured ? "text-on-forest-muted" : "text-ink-soft"}`}>{item.description}</p>
            </div>
          </Link>
        );
      })}
      </div>
    </section>
  );
}
