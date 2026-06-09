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
      title="Nhóm xây dựng Agromind AI có phân công rõ ràng từ khảo sát, AI, website đến kiểm thử và truyền thông."
      description="Mỗi thành viên phụ trách một mảng cụ thể để sản phẩm vừa có giá trị công nghệ, vừa bám sát nhu cầu thật của người dùng Việt Nam."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {teamMembers.map((member, index) => {
          const isPortraitCrop = ["pham-tuan-minh", "pham-duc-manh"].includes(member.id);
          const isCertificateCrop = member.id === "le-hoang-son";
          const isFaceCrop = member.id === "nguyen-thi-thu-trang";
          const isWideCrop = member.id === "dinh-my-uyen";

          return (
            <Reveal key={member.id} delay={index * 0.06}>
              <Card className="h-full rounded-[30px] border-white/70 bg-white/90 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-float">
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-50 to-lime-50 p-4">
                  <Image
                    src={member.avatar}
                    alt={member.name}
                    width={160}
                    height={160}
                    className={
                      isPortraitCrop
                        ? "mx-auto h-40 w-full max-w-[140px] origin-top translate-y-1 scale-[2.15] rounded-[22px] object-contain object-top"
                        : isCertificateCrop
                          ? "mx-auto h-40 w-full max-w-[180px] origin-top -translate-y-2 scale-[2.05] rounded-[22px] object-contain object-top"
                          : isFaceCrop
                            ? "mx-auto h-40 w-full max-w-[160px] translate-y-2 scale-[1.18] rounded-[22px] object-contain object-center"
                            : isWideCrop
                              ? "mx-auto h-40 w-full max-w-[185px] translate-y-4 scale-[1.55] rounded-[22px] object-contain object-center"
                              : "mx-auto h-40 w-full max-w-[140px] rounded-[22px] object-contain object-bottom"
                    }
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
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Nhiệm vụ
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.responsibilities.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-brand-800"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 rounded-[20px] bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Nội dung xuất hiện
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
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
