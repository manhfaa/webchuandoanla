import Link from "next/link";
import { ArrowUpRight, BookOpen, CloudSun, History, Leaf, MessageSquareText, ScanSearch, Sprout } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

const featureGroups = [
  {
    name: "Phân tích lá",
    caption: "Nhìn rõ dấu hiệu cần chú ý",
    items: [
      { title: "Kiểm tra ảnh lá", description: "Xác nhận ảnh đủ rõ và xem các khả năng bệnh kèm độ tin cậy.", href: "/login?next=/dashboard/diagnosis", icon: ScanSearch },
      { title: "Đối chiếu triệu chứng", description: "Bổ sung quan sát thực tế và xem nguồn tham khảo liên quan.", href: "/login?next=/dashboard/diagnosis", icon: Leaf },
    ],
  },
  {
    name: "Theo dõi vườn",
    caption: "Ghi nhận thay đổi theo thời gian",
    items: [
      { title: "Thời tiết & cảnh báo", description: "Theo dõi điều kiện tại vị trí vườn và các tín hiệu cần lưu ý.", href: "/login?next=/dashboard/weather-alerts", icon: CloudSun },
      { title: "Lịch sử kiểm tra", description: "Xem lại ảnh, kết quả và những lần cần chụp lại.", href: "/login?next=/dashboard/history", icon: History },
      { title: "Lô vườn", description: "Gắn nhật ký chăm sóc và kết quả kiểm tra với từng khu vực trồng.", href: "/login?next=/dashboard/farms", icon: Sprout },
    ],
  },
  {
    name: "Ra quyết định",
    caption: "Biến thông tin thành hành động",
    items: [
      { title: "Kế hoạch chăm sóc", description: "Sắp xếp việc tưới, bón và theo dõi cây theo từng giai đoạn.", href: "/login?next=/dashboard/crop-plans", icon: Sprout },
      { title: "Chat tư vấn", description: "Đặt câu hỏi dựa trên kết quả đã lưu hoặc hỏi vấn đề nông nghiệp.", href: "/login?next=/dashboard/chat", icon: MessageSquareText },
      { title: "Thư viện vật tư", description: "Tra cứu hướng dẫn sử dụng và lưu ý an toàn trước khi áp dụng.", href: "/login?next=/dashboard/input-library", icon: BookOpen },
    ],
  },
];

const groupStyles = [
  {
    frame: "border-leaf/35 bg-surface-soft",
    rail: "bg-leaf",
    number: "bg-leaf text-on-leaf",
    label: "text-leaf-strong",
    icon: "bg-leaf/10 text-leaf-strong",
    item: "hover:border-leaf/40 hover:bg-surface-raised",
  },
  {
    frame: "border-info/25 bg-surface-raised",
    rail: "bg-info",
    number: "bg-info text-on-forest shadow-sm",
    label: "text-info",
    icon: "bg-info/10 text-info",
    item: "hover:border-info/35 hover:bg-surface-soft",
  },
  {
    frame: "border-sun/35 bg-surface-raised",
    rail: "bg-sun",
    number: "bg-sun text-forest shadow-sm",
    label: "text-soil",
    icon: "bg-sun/15 text-soil",
    item: "hover:border-sun/40 hover:bg-surface-soft",
  },
];

export function FeaturesSection() {
  return (
    <SectionShell
      id="tinh-nang"
      eyebrow="Bộ công cụ chăm sóc cây"
      title="Mọi công cụ cần thiết để theo dõi sức khỏe cây từ ảnh lá đến việc chăm sóc"
      description="Agromind sắp xếp tính năng theo đúng cách bạn làm việc ngoài vườn: quan sát, theo dõi rồi mới quyết định hành động."
      className="relative overflow-hidden bg-canvas"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {featureGroups.map((featureGroup, groupIndex) => {
          const styles = groupStyles[groupIndex];
          return (
            <Reveal key={featureGroup.name} delay={groupIndex * 0.06}>
              <SurfaceCard variant="raised" padding="none" className={cn("relative h-full overflow-hidden rounded-xl", styles.frame)}>
                <span className={cn("absolute inset-x-0 top-0 h-1", styles.rail)} aria-hidden />
                <div className="p-6 pt-7">
                  <div className="flex items-start gap-4 border-b border-line pb-5">
                    <span className={cn("inline-flex h-12 min-w-12 items-center justify-center rounded-xl font-display text-lg font-extrabold tabular-nums", styles.number)}>
                      {String(groupIndex + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("text-xs font-bold uppercase tracking-[0.12em]", styles.label)}>Nhóm {groupIndex + 1}</p>
                      <h3 className="mt-1.5 font-display text-2xl font-bold tracking-[-0.025em] text-ink">{featureGroup.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">{featureGroup.caption}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {featureGroup.items.map(({ title, description, href, icon: Icon }) => (
                      <Link key={title} href={href} className={cn("group/item block rounded-lg border border-line bg-surface p-4 transition duration-180 hover:-translate-y-0.5 hover:shadow-sm", styles.item)}>
                        <div className="flex items-start gap-3.5">
                          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-180 group-hover/item:scale-105", styles.icon)}>
                            <Icon size={19} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-ink">{title}</p>
                              <ArrowUpRight size={16} className="shrink-0 text-ink-soft transition group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:text-ink" aria-hidden />
                            </div>
                            <p className="mt-1 text-sm leading-6 text-ink-soft">{description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {groupIndex === 0 ? (
                    <Link
                      href="/login?next=/dashboard/diagnosis"
                      className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-leaf p-4 text-on-leaf shadow-sm transition duration-180 hover:-translate-y-0.5 hover:bg-leaf-strong hover:shadow-md"
                    >
                      <span>
                        <span className="block text-sm font-bold">Bắt đầu với một ảnh lá</span>
                        <span className="mt-1 block text-xs font-medium opacity-80">Tải ảnh rõ để xem các dấu hiệu cần chú ý.</span>
                      </span>
                      <ArrowUpRight size={19} className="shrink-0" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </SurfaceCard>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
