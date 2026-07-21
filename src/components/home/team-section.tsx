import Image from "next/image";

import { SectionShell } from "@/components/layout/section-shell";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { teamMembers } from "@/data/mock/team";

export function TeamSection() {
  return (
    <SectionShell
      id="thanh-vien"
      eyebrow="Đội ngũ phát triển"
      title="Năm vai trò cùng xây dựng một trải nghiệm gần với nhu cầu người trồng cây"
      description="Từ khảo sát, mô hình AI, website đến kiểm thử và truyền thông, mỗi phần việc đều hướng về một sản phẩm dễ hiểu và có thể sử dụng ngoài thực tế."
      className="bg-surface-soft"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {teamMembers.map((member, index) => {
          const isPortraitCrop = ["pham-tuan-minh", "pham-duc-manh"].includes(member.id);
          const isCertificateCrop = member.id === "le-hoang-son";
          const isFaceCrop = member.id === "nguyen-thi-thu-trang";
          const isWideCrop = member.id === "dinh-my-uyen";
          const imageFrameClass = isPortraitCrop
            ? "relative mx-auto h-44 w-full max-w-[140px]"
            : isCertificateCrop
              ? "relative mx-auto h-44 w-full max-w-[180px]"
              : isFaceCrop
                ? "relative mx-auto h-44 w-full max-w-[160px]"
                : isWideCrop
                  ? "relative mx-auto h-44 w-full max-w-[185px]"
                  : "relative mx-auto h-44 w-full max-w-[140px]";
          const imageClass = isPortraitCrop
            ? "origin-top translate-y-1 scale-[2.15] object-contain object-top"
            : isCertificateCrop
              ? "origin-top -translate-y-2 scale-[1.9] object-contain object-top"
              : isFaceCrop
                ? "translate-y-2 scale-[1.18] object-contain object-center"
                : isWideCrop
                  ? "translate-y-4 scale-[1.55] object-contain object-center"
                  : "object-contain object-bottom";

          return (
            <Reveal key={member.id} delay={index * 0.06}>
              <Card variant="raised" padding="none" className="group flex h-full flex-col overflow-hidden rounded-xl transition duration-180 hover:-translate-y-1 hover:border-leaf/35 hover:shadow-lg">
                <div className="relative overflow-hidden border-b border-line bg-surface p-4">
                  <span className="absolute left-4 top-4 z-10 inline-flex h-9 min-w-10 items-center justify-center rounded-lg bg-forest px-2 font-display text-sm font-extrabold tabular-nums text-on-forest shadow-sm">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={imageFrameClass}>
                    <Image
                      src={member.avatar}
                      alt={member.name}
                      fill
                      sizes="(min-width: 1280px) 185px, (min-width: 768px) 40vw, 90vw"
                      className={imageClass}
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] font-bold uppercase leading-5 tracking-[0.12em] text-leaf-strong">
                    {member.role}
                  </p>
                  <h3 className="mt-2 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    {member.description}
                  </p>
                  <div className="mt-auto pt-5">
                    <div className="border-t border-line pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">Đóng góp chính</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-ink">{member.responsibilities.slice(0, 2).join(" · ")}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
