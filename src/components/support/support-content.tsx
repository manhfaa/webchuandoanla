"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, Mail, ShieldCheck } from "lucide-react";

import { DEVELOPER } from "@/constants/brand";
import { TEAM_LEAD } from "@/constants/leadership";
import { CONTACT_EMAIL } from "@/data/legal-content";
import { useTr } from "@/lib/use-tr";

const mailto = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

export function SupportContent() {
  const tr = useTr();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-ink-soft transition hover:text-leaf-strong">
        <ArrowLeft size={16} aria-hidden /> {tr("Về trang chủ", "Back to home")}
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-strong">{tr("Liên hệ & hỗ trợ", "Contact & support")}</p>
          <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.25rem,5vw,4.5rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink">
            {tr("Cần hỗ trợ? Hãy nói cho chúng tôi biết.", "Need help? Let us know.")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-ink-soft">
            {tr(
              "Gửi câu hỏi về tài khoản, thanh toán hoặc cách sử dụng Agromind AI. Nêu rõ vấn đề và email tài khoản để chúng tôi có thể kiểm tra nhanh hơn.",
              "Ask us about your account, payments or using Agromind AI. Describe the issue and include your account email so we can investigate faster.",
            )}
          </p>

          <div className="mt-10 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-leaf-strong"><Mail size={21} aria-hidden /></span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-ink">{tr("Email hỗ trợ", "Support email")}</h2>
                <a href={mailto("Agromind AI - Support")} className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 break-all font-semibold text-leaf-strong underline underline-offset-4 hover:text-leaf">
                  {CONTACT_EMAIL} <ArrowUpRight size={17} className="shrink-0" aria-hidden />
                </a>
              </div>
            </div>
            <div className="mt-5 flex gap-3 border-t border-line pt-5 text-sm leading-6 text-ink-soft">
              <Clock3 size={19} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
              <p>{tr(
                "Thời gian phản hồi dự kiến: 1–3 ngày làm việc. Đây là thời gian tham khảo, không phải cam kết phản hồi tức thì.",
                "Expected response: 1–3 business days. This is an estimate, not a promise of an immediate reply.",
              )}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-surface-soft p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <Image src="/logos/dieptek-mark-transparent.png" alt={`${DEVELOPER} logo`} width={64} height={64} className="h-16 w-16 shrink-0 object-contain" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf-strong">{tr("Đầu mối hỗ trợ", "Support contact")}</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink">{DEVELOPER}</h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-ink-soft">
              {tr(
                "Agromind AI được nhóm DIEPTEK phát triển và vận hành. Nhóm tiếp nhận yêu cầu hỗ trợ tài khoản, thanh toán và sử dụng sản phẩm qua email ở bên cạnh.",
                "Agromind AI is developed and operated by the DIEPTEK team. The team receives account, payment and product support requests at the email shown here.",
              )}
            </p>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              {tr(`${TEAM_LEAD} là người sáng lập, trưởng nhóm phát triển và phụ trách kỹ thuật Agromind AI.`, `${TEAM_LEAD} founded Agromind AI and leads its development and technical direction.`)}
            </p>
            <Link href="/about#team-lead" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-leaf-strong underline underline-offset-4 hover:text-leaf">
              {tr("Tìm hiểu về người sáng lập và nhóm", "Learn about the founder and team")} <ArrowUpRight size={16} aria-hidden />
            </Link>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink">{tr("Để được hỗ trợ nhanh hơn", "Help us help you faster")}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink-soft">
              <li>{tr("Tài khoản: cho biết email đăng nhập và mô tả lỗi.", "Account: include your sign-in email and a description of the issue.")}</li>
              <li>{tr("Thanh toán: cho biết gói, thời điểm thanh toán và mã giao dịch nếu có.", "Payment: include the plan, payment time and transaction reference if available.")}</li>
              <li>{tr("Kết quả kiểm tra: gửi đường dẫn kết quả hoặc ảnh chụp màn hình; không cần gửi ảnh riêng tư không liên quan.", "Check result: send the result link or a screenshot; avoid unrelated private photos.")}</li>
            </ul>
            <div className="mt-6 flex gap-3 border-t border-line pt-5 text-sm leading-6 text-ink-soft">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
              <p>{tr("Không gửi mật khẩu, mã xác minh, khóa API hoặc thông tin thẻ qua email.", "Never email passwords, verification codes, API keys or card details.")}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
