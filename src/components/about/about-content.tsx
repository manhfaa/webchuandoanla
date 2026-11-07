"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Leaf, ShieldCheck } from "lucide-react";

import { DEVELOPER } from "@/constants/brand";
import { ACHIEVEMENT_SOURCES, TEAM_LEAD } from "@/constants/leadership";
import { useTr } from "@/lib/use-tr";

export function AboutContent() {
  const tr = useTr();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-ink-soft transition hover:text-leaf-strong">
        <ArrowLeft size={16} aria-hidden /> {tr("Về trang chủ", "Back to home")}
      </Link>

      <header className="mt-9 max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-strong">
          {tr("Con người đứng sau sản phẩm", "The people behind the product")}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,4.5rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink">
          {tr("Ai là trưởng nhóm Agromind AI?", "Who leads Agromind AI?")}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-soft">
          {tr(
            `${TEAM_LEAD} là trưởng nhóm phát triển Agromind AI thuộc ${DEVELOPER}, phụ trách chung dự án và định hướng kỹ thuật.`,
            `${TEAM_LEAD} leads Agromind AI's development team at ${DEVELOPER}, overseeing the project and its technical direction.`,
          )}
        </p>
      </header>

      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-3xl bg-forest p-7 text-on-forest sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 text-on-forest">
            <Leaf size={24} aria-hidden />
          </div>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-on-forest-muted">
            {tr("Trưởng nhóm & phụ trách kỹ thuật", "Team lead & technical direction")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{TEAM_LEAD}</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-on-forest-muted">
            {tr(
              `Agromind AI là sản phẩm do nhóm ${DEVELOPER} phát triển. ${TEAM_LEAD} điều phối định hướng chung và các quyết định kỹ thuật của dự án.`,
              `Agromind AI is developed by the ${DEVELOPER} team. ${TEAM_LEAD} coordinates the project's overall direction and technical decisions.`,
            )}
          </p>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-7 sm:p-10">
          <BadgeCheck size={28} className="text-leaf-strong" aria-hidden />
          <h2 className="mt-6 font-display text-2xl font-bold text-ink">
            {tr("Thành tích có nguồn đối chiếu", "Achievements with sources")}
          </h2>
          <div className="mt-6 space-y-7 text-sm leading-7 text-ink-soft">
            <div>
              <h3 className="font-semibold text-ink">{tr("Giải Ba khoa học kỹ thuật cấp quốc gia", "Third prize, national science and engineering competition")}</h3>
              <p className="mt-1">{tr(
                `${TEAM_LEAD} là thành viên đội DermAI đạt Giải Ba cuộc thi dành cho học sinh THCS và THPT năm học 2025–2026.`,
                `${TEAM_LEAD} was a member of DermAI, which won third prize in the 2025–2026 national student competition.`,
              )}</p>
              <a href={ACHIEVEMENT_SOURCES.nationalScience} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-leaf-strong underline underline-offset-4 hover:text-leaf">
                {tr("Xem công bố của FPT Schools", "Read the FPT Schools announcement")} <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
            <div className="border-t border-line pt-6">
              <h3 className="font-semibold text-ink">{tr("Champion of Mastery, The NextX 2026", "Champion of Mastery, The NextX 2026")}</h3>
              <p className="mt-1">{tr(
                `${TEAM_LEAD} là thành viên đội Green Green, đội giành chức vô địch với giải thưởng tập thể trị giá 500 triệu đồng. Green Green là tên đội trước khi đổi thành ${DEVELOPER}.`,
                `${TEAM_LEAD} was a member of Green Green, the winning team whose collective prize was valued at VND 500 million. Green Green later became ${DEVELOPER}.`,
              )}</p>
              <a href={ACHIEVEMENT_SOURCES.theNextX} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-leaf-strong underline underline-offset-4 hover:text-leaf">
                {tr("Xem công bố của FPT Schools", "Read the FPT Schools announcement")} <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-soft p-6 text-sm leading-7 text-ink-soft">
        <ShieldCheck size={22} className="shrink-0 text-leaf-strong" aria-hidden />
        <p className="max-w-3xl">
          {tr(
            "Giải The NextX là thành tích của cả đội, không phải khoản thưởng cá nhân. Trang này phân biệt vai trò của trưởng nhóm với thành tích tập thể.",
            "The NextX award belongs to the team, not to one individual. This page distinguishes the team lead's role from the team's achievements.",
          )}
        </p>
      </div>
    </div>
  );
}
