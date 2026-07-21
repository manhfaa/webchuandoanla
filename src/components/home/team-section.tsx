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
      className="bg-surface"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {teamMembers.map((member, index) => {
          const isPortraitCrop = ["pham-tuan-minh", "pham-duc-manh"].includes(member.id);
          const isCertificateCrop = member.id === "le-hoang-son";
          const isFaceCrop = member.id === "nguyen-thi-thu-trang";
          const isWideCrop = member.id === "dinh-my-uyen";

          return (
            <Reveal key={member.id} delay={index * 0.06}>
              <Card variant="raised" className="h-full overflow-hidden p-4 transition duration-180 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative overflow-hidden rounded-2xl bg-surface-soft p-4">
                  <Image
                    src={member.avatar}
                    alt={member.name}
                    width={160}
                    height={160}
                    className={
                      isPortraitCrop
                        ? "mx-auto h-44 w-full max-w-[140px] origin-top translate-y-1 scale-[2.15] object-contain object-top"
                        : isCertificateCrop
                          ? "mx-auto h-44 w-full max-w-[180px] origin-top -translate-y-2 scale-[1.9] object-contain object-top"
                          : isFaceCrop
                            ? "mx-auto h-44 w-full max-w-[160px] translate-y-2 scale-[1.18] object-contain object-center"
                            : isWideCrop
                              ? "mx-auto h-44 w-full max-w-[185px] translate-y-4 scale-[1.55] object-contain object-center"
                              : "mx-auto h-44 w-full max-w-[140px] object-contain object-bottom"
                    }
                  />
                </div>
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
                    {member.role}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-bold text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    {member.description}
                  </p>
                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Đóng góp chính</p>
                    <p className="mt-2 text-xs font-medium leading-5 text-ink">{member.responsibilities.slice(0, 2).join(" · ")}</p>
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
