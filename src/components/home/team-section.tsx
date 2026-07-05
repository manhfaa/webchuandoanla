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
      title="Agromind AI được xây dựng bởi nhóm phát triển trẻ với các vai trò rõ ràng từ khảo sát, AI, website đến kiểm thử."
      description="Mỗi thành viên đóng góp vào một phần của sản phẩm để trải nghiệm sử dụng gần gũi hơn với nhu cầu của người trồng cây Việt Nam."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {teamMembers.map((member, index) => {
          const isPortraitCrop = ["pham-tuan-minh", "pham-duc-manh"].includes(member.id);
          const isCertificateCrop = member.id === "le-hoang-son";
          const isFaceCrop = member.id === "nguyen-thi-thu-trang";
          const isWideCrop = member.id === "dinh-my-uyen";

          return (
            <Reveal key={member.id} delay={index * 0.06}>
              <Card className="h-full rounded-[30px] border-white/70 bg-white/90 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-float dark:border-white/10 dark:bg-white/10">
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-50 to-lime-50 p-4 dark:from-emerald-300/12 dark:to-lime-200/10">
                  <Image
                    src={member.avatar}
                    alt={member.name}
                    width={160}
                    height={160}
                    className={
                      isPortraitCrop
                        ? "mx-auto h-40 w-full max-w-[140px] origin-top translate-y-1 scale-[2.15] rounded-[22px] object-contain object-top"
                        : isCertificateCrop
                          ? "mx-auto h-40 w-full max-w-[180px] origin-top -translate-y-2 scale-[1.9] rounded-[22px] object-contain object-top"
                          : isFaceCrop
                            ? "mx-auto h-40 w-full max-w-[160px] translate-y-2 scale-[1.18] rounded-[22px] object-contain object-center"
                            : isWideCrop
                              ? "mx-auto h-40 w-full max-w-[185px] translate-y-4 scale-[1.55] rounded-[22px] object-contain object-center"
                              : "mx-auto h-40 w-full max-w-[140px] rounded-[22px] object-contain object-bottom"
                    }
                  />
                </div>
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-700 dark:text-lime-100">
                    {member.role}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-ink dark:text-white">
                    {member.name}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-emerald-50/75">
                    {member.description}
                  </p>
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-emerald-50/60">
                      Vai trò chính
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.responsibilities.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:border-white/10 dark:bg-white/10 dark:text-emerald-50"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 rounded-[20px] bg-slate-50 p-4 dark:bg-white/10">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-emerald-50/60">
                      Đóng góp chính
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-emerald-50/75">
                      {member.presentationFocus.join(", ")}
                    </p>
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
