"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { DEVELOPER } from "@/constants/brand";
import { ACHIEVEMENT_SOURCES, TEAM_LEAD } from "@/constants/leadership";
import { useTr } from "@/lib/use-tr";

const sourceLinkClass = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-current/40 underline-offset-[6px] transition hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4";

export function AboutContent() {
  const tr = useTr();

  return (
    <div className="overflow-hidden">
      <div className="mx-auto max-w-[1320px] px-4 pt-24 sm:px-6 lg:px-8">
        <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-ink-soft transition hover:text-leaf-strong">
          <ArrowLeft size={16} aria-hidden /> {tr("Về trang chủ", "Back to home")}
        </Link>

        <header className="about-enter relative mt-6 grid overflow-hidden rounded-[24px] bg-forest text-on-forest lg:min-h-[610px] lg:grid-cols-[1fr_0.94fr] lg:rounded-[32px]">
          <div className="relative z-10 flex flex-col justify-between gap-12 px-7 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-[#B9DDB0]">Agromind AI / {DEVELOPER}</p>
              <h1 className="mt-10 max-w-[9ch] font-display text-[clamp(3.1rem,6vw,6.5rem)] font-extrabold leading-[0.99] tracking-[-0.065em] sm:mt-14">
                {TEAM_LEAD}
              </h1>
              <p className="mt-8 max-w-xl text-[clamp(1.1rem,1.8vw,1.45rem)] font-semibold leading-snug text-on-forest">
                {tr("Trưởng nhóm Green Green. Người dẫn dắt Agromind AI.", "Green Green team lead. The person leading Agromind AI.")}
              </p>
            </div>
            <p className="max-w-lg border-l-2 border-[#8CCF75] pl-5 text-sm leading-7 text-on-forest-muted sm:text-base">
              {tr(
                `Phạm Đức Mạnh là trưởng nhóm Green Green tại The NextX 2026; hiện phụ trách chung và định hướng kỹ thuật cho Agromind AI do ${DEVELOPER} phát triển.`,
                `Phạm Đức Mạnh led Green Green at The NextX 2026 and now oversees Agromind AI's overall and technical direction with ${DEVELOPER}.`,
              )}
            </p>
          </div>
          <div className="relative min-h-[340px] overflow-hidden bg-[#263d2b] sm:min-h-[480px] lg:min-h-full">
            <Image
              src="/about/pham-duc-manh.jpg"
              alt={tr("Phạm Đức Mạnh giới thiệu Agromind AI tại The NextX", "Phạm Đức Mạnh presenting Agromind AI at The NextX")}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 46vw"
              className="object-cover object-[58%_center]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14291a]/35 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#14291a]/30 lg:to-transparent" />
          </div>
        </header>
      </div>

      <section className="mx-auto max-w-[1320px] px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pb-28" aria-labelledby="achievements-heading">
        <div className="about-enter about-enter-delay mb-10 max-w-3xl sm:mb-14">
          <p className="text-sm font-semibold text-leaf-strong">{tr("Hành trình nghiên cứu", "A research journey")}</p>
          <h2 id="achievements-heading" className="mt-4 font-display text-[clamp(2rem,4.2vw,4.25rem)] font-bold leading-[1.08] tracking-[-0.045em] text-ink">
            {tr("Từ nghiên cứu khoa học đến một sản phẩm cho người trồng.", "From scientific research to a product for growers.")}
          </h2>
        </div>

        <article className="about-enter about-enter-delay grid overflow-hidden rounded-[24px] border border-line bg-surface shadow-sm lg:grid-cols-[1.13fr_0.87fr] lg:rounded-[32px]">
          <div className="relative min-h-[270px] sm:min-h-[430px] lg:min-h-[520px]">
            <Image
              src="/about/giai-ba-khoa-hoc-ky-thuat.jpg"
              alt={tr("Đội DermAI nhận Giải Ba tại cuộc thi khoa học kỹ thuật cấp quốc gia", "DermAI receiving third prize at the national science and engineering competition")}
              fill
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover object-center"
            />
          </div>
          <div className="flex flex-col justify-between gap-10 p-7 sm:p-12 lg:p-14">
            <div>
              <p className="text-sm font-semibold text-leaf-strong">{tr("Khoa học kỹ thuật / 2026", "Science & engineering / 2026")}</p>
              <h3 className="mt-5 font-display text-[clamp(2.2rem,3.5vw,3.8rem)] font-bold leading-[1.08] tracking-[-0.05em] text-ink">
                {tr("Giải Ba cấp quốc gia", "National third prize")}
              </h3>
              <p className="mt-6 max-w-[46ch] text-base leading-8 text-ink-soft">
                {tr(
                  `Năm học 2025–2026, ${TEAM_LEAD} cùng đội DermAI đạt Giải Ba Cuộc thi nghiên cứu khoa học, kỹ thuật cấp quốc gia dành cho học sinh THCS và THPT.`,
                  `In 2025–2026, ${TEAM_LEAD} and DermAI won third prize in Vietnam's national science and engineering competition for secondary school students.`,
                )}
              </p>
            </div>
            <a href={ACHIEVEMENT_SOURCES.nationalScience} target="_blank" rel="noopener noreferrer" className={`${sourceLinkClass} text-leaf-strong`}>
              {tr("Xem công bố của FPT Schools", "Read the FPT Schools announcement")} <ArrowUpRight size={17} aria-hidden />
            </a>
          </div>
        </article>

        <article className="about-enter about-enter-delay mt-7 grid overflow-hidden rounded-[24px] bg-forest text-on-forest lg:grid-cols-[0.8fr_1.2fr] lg:rounded-[32px]">
          <div className="flex flex-col justify-between gap-10 p-7 sm:p-12 lg:p-14">
            <div>
              <p className="text-sm font-semibold text-[#B9DDB0]">The NextX / 2026</p>
              <h3 className="mt-5 font-display text-[clamp(2.2rem,3.7vw,4rem)] font-bold leading-[1.08] tracking-[-0.05em]">
                Champion of Mastery
              </h3>
              <p className="mt-6 max-w-[44ch] text-base leading-8 text-on-forest-muted">
                {tr(
                  `Với vai trò trưởng nhóm Green Green, ${TEAM_LEAD} cùng đội giành chức vô địch The NextX 2026. Giải thưởng tập thể trị giá 500 triệu đồng. Green Green sau đó đổi tên thành ${DEVELOPER}.`,
                  `As Green Green's team lead, ${TEAM_LEAD} and the team won The NextX 2026. The team prize was valued at VND 500 million. Green Green later became ${DEVELOPER}.`,
                )}
              </p>
            </div>
            <a href={ACHIEVEMENT_SOURCES.theNextX} target="_blank" rel="noopener noreferrer" className={`${sourceLinkClass} text-[#B9DDB0]`}>
              {tr("Xem công bố của FPT Schools", "Read the FPT Schools announcement")} <ArrowUpRight size={17} aria-hidden />
            </a>
          </div>
          <div className="relative min-h-[300px] sm:min-h-[440px] lg:min-h-[560px]">
            <Image
              src="/about/green-green-the-nextx.jpg"
              alt={tr("Đội Green Green nhận giải Champion of Mastery trị giá 500 triệu đồng tại The NextX 2026", "Green Green receiving the VND 500 million Champion of Mastery team prize at The NextX 2026")}
              fill
              sizes="(max-width: 1023px) 100vw, 60vw"
              className="object-cover object-center"
            />
          </div>
        </article>
      </section>
    </div>
  );
}
