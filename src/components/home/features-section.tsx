import { ArrowUpRight } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { featureItems } from "@/data/mock/features";

export function FeaturesSection() {
  return (
    <SectionShell
      id="tinh-nang"
      eyebrow="Tính năng nổi bật"
      title="Một hành trình AI nông nghiệp được thiết kế như sản phẩm thực tế, không chỉ là giao diện minh họa."
      description="Agromind AI cho thấy rõ từng lớp giá trị từ xác thực ảnh đầu vào, lưu lịch sử, tư vấn Light RAG đến lộ trình mở rộng CNN sau này."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {featureItems.map((item, index) => (
          <Reveal key={item.id} delay={index * 0.05}>
            <Card className="relative h-full overflow-hidden rounded-[32px] border-white/70 bg-white/90 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-float">
              <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
              <div className="relative">
                <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-800">
                  {item.eyebrow}
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand-700">
                  Xem luồng trải nghiệm
                  <ArrowUpRight size={16} />
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
