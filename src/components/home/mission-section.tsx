import { LineChart, ShieldCheck, Sprout } from "lucide-react";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { brand } from "@/constants/brand";

const missionPillars = [
  {
    icon: Sprout,
    title: "Nâng cao hiệu quả canh tác",
    description: "Biến việc quan sát lá cây thành một quy trình số hóa rõ ràng và tiết kiệm thời gian hơn.",
  },
  {
    icon: ShieldCheck,
    title: "Phát hiện bệnh sớm",
    description: "Tăng khả năng can thiệp kịp thời trước khi bệnh lan rộng và gây tổn thất năng suất.",
  },
  {
    icon: LineChart,
    title: "Ra quyết định tự tin hơn",
    description: "Cung cấp lớp giao diện giải thích trực quan để người dùng dễ hiểu cả khi không rành công nghệ.",
  },
];

export function MissionSection() {
  return (
    <SectionShell
      eyebrow="Sứ mệnh thương hiệu"
      title="Agromind AI định vị mình là nền tảng nông nghiệp công nghệ cao, sạch, thân thiện và đáng tin cậy."
      description={brand.mission}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <Card className="rounded-[36px] bg-[#10231c] p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/60">
              Brand direction
            </p>
            <h3 className="mt-4 font-display text-4xl font-semibold">
              Công nghệ AI đủ gần gũi để nông dân tin dùng ngay từ lần đầu.
            </h3>
            <p className="mt-5 max-w-2xl text-base leading-8 text-emerald-50/75">
              Agromind AI dùng cách trình bày trực quan, ngôn ngữ tiếng Việt rõ ràng và các tín hiệu thương hiệu sạch sẽ để giảm cảm giác phức tạp thường gặp trong sản phẩm AI.
            </p>
          </Card>
        </Reveal>
        <div className="grid gap-4">
          {missionPillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={index * 0.05}>
                <Card className="rounded-[30px] border-white/75 bg-white/90 p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-brand-700">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        {pillar.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
