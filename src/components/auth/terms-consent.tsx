"use client";

import Link from "next/link";
import { useId } from "react";
import { ExternalLink } from "lucide-react";

import { useTr } from "@/lib/use-tr";

interface TermsConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

/**
 * Shared by /register and the first-time Google sign-in step so both paths ask
 * for — and send — the same agreement. Consent is recorded server-side against
 * the account, not just enforced in the browser.
 */
export function TermsConsentCheckbox({ checked, onChange, required = true }: TermsConsentCheckboxProps) {
  const tr = useTr();
  const textId = useId();

  /**
   * Mở tab mới là cố ý: form đăng ký giữ state bằng useState, rời trang cùng
   * tab là mất sạch email và mật khẩu vừa gõ. Nhưng trước đây không có dấu hiệu
   * nào cho biết điều đó, nên người dùng bấm xong thấy màn hình lạ và không rõ
   * mình có mất dữ liệu hay không. Biểu tượng nói trước điều sắp xảy ra.
   */
  const legalLink = (href: string, label: string) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 font-semibold text-leaf-strong underline underline-offset-2 hover:text-leaf"
    >
      {label}
      <ExternalLink size={12} aria-hidden className="shrink-0 self-center" />
      <span className="sr-only">{tr(" (mở ở tab mới)", " (opens in a new tab)")}</span>
    </Link>
  );

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--r-md)] border border-line bg-surface-soft p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={textId}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--leaf)]"
        required={required}
      />
      <span id={textId} className="text-xs leading-6 text-ink-soft sm:text-sm">
        {tr("Tôi đã đọc và đồng ý với ", "I have read and agree to the ")}
        {legalLink("/terms", tr("Điều khoản sử dụng", "Terms of Service"))}
        {tr(" và ", " and ")}
        {legalLink("/privacy", tr("Chính sách quyền riêng tư", "Privacy Policy"))}
        {tr(
          ". Tôi hiểu kết quả từ Agromind AI chỉ mang tính tham khảo, không thay thế ý kiến chuyên gia nông nghiệp.",
          ". I understand that Agromind AI results are advisory only and do not replace advice from an agriculture expert.",
        )}
      </span>
    </label>
  );
}
