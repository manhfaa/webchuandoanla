import Link from "next/link";
import { ArrowUpRight, BookOpen, CloudSun, History, Leaf, MessageSquareText, ScanSearch, Sprout } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { SurfaceCard } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

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

export function FeaturesSection() {
  return (
    <SectionShell
      id="tinh-nang"
      eyebrow="Bộ công cụ Field Lens"
      title="Mọi công cụ cần thiết để theo dõi sức khỏe cây từ ảnh lá đến việc chăm sóc"
      description="Agromind sắp xếp tính năng theo đúng cách bạn làm việc ngoài vườn: quan sát, theo dõi rồi mới quyết định hành động."
      className="relative overflow-hidden bg-canvas"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {featureGroups.map((featureGroup, groupIndex) => (
          <Reveal key={featureGroup.name} delay={groupIndex * 0.06}>
            <SurfaceCard variant={groupIndex === 0 ? "dark" : "raised"} padding="lg" className="h-full">
              <div className="border-b border-line pb-5">
                <p className={groupIndex === 0 ? "text-xs font-semibold uppercase tracking-[0.12em] text-on-forest-muted" : "text-xs font-semibold uppercase tracking-[0.12em] text-leaf-strong"}>
                  Nhóm {groupIndex + 1}
                </p>
                <h3 className={groupIndex === 0 ? "mt-2 font-display text-2xl font-bold text-on-forest" : "mt-2 font-display text-2xl font-bold text-ink"}>{featureGroup.name}</h3>
                <p className={groupIndex === 0 ? "mt-2 text-sm text-on-forest-muted" : "mt-2 text-sm text-ink-soft"}>{featureGroup.caption}</p>
              </div>

              <div className="mt-5 space-y-3">
                {featureGroup.items.map(({ title, description, href, icon: Icon }) => (
                  <Link key={title} href={href} className={groupIndex === 0 ? "group block rounded-2xl border border-on-forest/10 bg-on-forest/5 p-4 transition duration-180 hover:-translate-y-0.5 hover:bg-on-forest/10" : "group block rounded-2xl border border-line bg-surface p-4 transition duration-180 hover:-translate-y-0.5 hover:bg-surface-soft"}>
                    <div className="flex items-start gap-3">
                      <span className={groupIndex === 0 ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-on-forest/10 text-on-forest" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong"}>
                        <Icon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className={groupIndex === 0 ? "font-semibold text-on-forest" : "font-semibold text-ink"}>{title}</p>
                          <ArrowUpRight size={16} className={groupIndex === 0 ? "shrink-0 text-on-forest-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" : "shrink-0 text-ink-soft transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"} aria-hidden />
                        </div>
                        <p className={groupIndex === 0 ? "mt-1 text-sm leading-6 text-on-forest-muted" : "mt-1 text-sm leading-6 text-ink-soft"}>{description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </SurfaceCard>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
