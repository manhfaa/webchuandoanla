import {
  ArrowUpRight,
  BrainCircuit,
  CloudSun,
  Database,
  FileSearch,
  Leaf,
  Microscope,
  ScanLine,
  Sprout,
} from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { featureItems } from "@/data/mock/features";

const featureIcons = {
  cnn: Microscope,
  yolo: ScanLine,
  tavily: FileSearch,
  deepseek: BrainCircuit,
  weather: CloudSun,
  history: Database,
  "crop-plans": Sprout,
};

export function FeaturesSection() {
  return (
    <SectionShell
      id="tinh-nang"
      eyebrow="Tính năng nổi bật"
      title="Các component trên landing page bám sát sản phẩm: nhận diện bệnh lá, kiểm chứng nguồn và quản lý canh tác."
      description="Mỗi tính năng đều liên quan trực tiếp đến hành trình người dùng thật: chụp ảnh lá, hiểu kết quả AI, kiểm chứng triệu chứng và theo dõi cây sau chẩn đoán."
      className="relative overflow-hidden"
    >
      <div className="pointer-events-none absolute left-0 top-24 -z-10 h-80 w-80 rounded-full bg-leaf-100/70 blur-3xl" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {featureItems.map((item, index) => {
          const Icon = featureIcons[item.id as keyof typeof featureIcons] ?? Leaf;
          return (
            <Reveal key={item.id} delay={index * 0.05}>
              <Card className="group relative h-full overflow-hidden rounded-[32px] border-white/75 bg-white/90 p-6 shadow-[0_18px_60px_rgba(17,64,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-float">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-leaf-800">
                      {item.eyebrow}
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-900 text-lime-100 shadow-sm transition group-hover:scale-105 group-hover:bg-leaf-600">
                      <Icon size={22} />
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold leading-tight text-ink-900">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-leaf-700">
                    Xem trong sản phẩm
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </Card>
            </Reveal>
          );
        })}

        <Reveal delay={featureItems.length * 0.05}>
          <Card className="relative h-full overflow-hidden rounded-[32px] border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-lime-50 p-6 shadow-[0_18px_60px_rgba(119,78,16,0.08)] xl:col-span-2">
            <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
              Lưu ý an toàn
            </div>
            <h3 className="mt-5 max-w-2xl font-display text-2xl font-semibold text-ink-900">
              AI hỗ trợ quyết định nhanh hơn, nhưng không thay thế quan sát thực địa.
            </h3>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
              Khi bệnh lan rộng, cây suy nhanh hoặc cần dùng thuốc bảo vệ thực vật, người dùng nên hỏi chuyên gia nông nghiệp địa phương để xử lý an toàn.
            </p>
          </Card>
        </Reveal>
      </div>
    </SectionShell>
  );
}
