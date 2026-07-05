import Link from "next/link";
import { ArrowRight, CalendarRange, History, MessageSquareText, ScanSearch } from "lucide-react";

import { cn } from "@/lib/utils";

const quickLinks = [
  {
    title: "Kiểm tra ảnh lá",
    description: "Tải hoặc chụp ảnh để Agromind AI hỗ trợ phân tích.",
    href: "/dashboard/diagnosis",
    icon: ScanSearch,
    featured: true,
  },
  {
    title: "Chat tư vấn",
    description: "Hỏi thêm về triệu chứng, chăm sóc cây hoặc sâu bệnh.",
    href: "/dashboard/chat",
    icon: MessageSquareText,
  },
  {
    title: "Xem lịch sử",
    description: "Xem lại các lần kiểm tra và khuyến nghị đã lưu.",
    href: "/dashboard/history",
    icon: History,
  },
  {
    title: "Kế hoạch trồng cây",
    description: "Theo dõi các việc chăm sóc cây theo từng bước.",
    href: "/dashboard/crop-plans",
    icon: CalendarRange,
  },
];

export function QuickAccessPanel() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {quickLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative min-h-[150px] overflow-hidden rounded-[28px] border border-[#7CFFB2]/[0.12] bg-[#0A2A1A]/80 p-5 text-[#F4FFF7] shadow-[0_24px_80px_rgba(0,0,0,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[#55D98B]/45 hover:bg-[#103D28]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75E0A1]/50",
              item.featured && "bg-[linear-gradient(135deg,rgba(16,61,40,.98),rgba(47,166,100,.28))]",
            )}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#55D98B]/10 blur-2xl transition group-hover:bg-[#55D98B]/18" />
            <div className="relative flex h-full flex-col justify-between gap-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#55D98B]/12 text-[#75E0A1]">
                  <Icon strokeWidth={2} className="h-5 w-5" aria-hidden />
                </span>
                <ArrowRight
                  strokeWidth={2}
                  className="h-5 w-5 shrink-0 text-[#9EB8A8] transition group-hover:translate-x-1 group-hover:text-[#75E0A1]"
                  aria-hidden
                />
              </div>

              <div>
                <h3 className="text-[22px] font-bold leading-tight text-[#F4FFF7]">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-[#9EB8A8]">{item.description}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
