import Image from "next/image";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { teamMembers } from "@/data/mock/team";

export function TeamSection() {
  return (
    <SectionShell
      id="thanh-vien"
      eyebrow="Đội ngũ dự án"
      title="Nhóm xây dựng Agromind AI kết hợp tư duy AI, sản phẩm và hiểu biết nông nghiệp."
      description="Các card thành viên được trình bày như một đội ngũ thật đang chuẩn bị thương mại hóa giải pháp, giúp tăng niềm tin thương hiệu ngay từ landing page."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {teamMembers.map((member, index) => (
          <Reveal key={member.id} delay={index * 0.06}>
            <Card className="h-full rounded-[30px] border-white/70 bg-white/90 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-float">
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-50 to-lime-50 p-4">
                <Image
                  src={member.avatar}
                  alt={member.name}
                  width={160}
                  height={160}
                  className="mx-auto aspect-square w-full max-w-[140px] rounded-[22px]"
                />
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  {member.role}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                  {member.name}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {member.description}
                </p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
