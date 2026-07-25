"use client";

import Link from "next/link";
import { useId } from "react";

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
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-leaf-strong underline underline-offset-2 hover:text-leaf">
          {tr("Điều khoản sử dụng", "Terms of Service")}
        </Link>
        {tr(" và ", " and ")}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-leaf-strong underline underline-offset-2 hover:text-leaf">
          {tr("Chính sách quyền riêng tư", "Privacy Policy")}
        </Link>
        {tr(
          ". Tôi hiểu kết quả từ Agromind AI chỉ mang tính tham khảo, không thay thế ý kiến chuyên gia nông nghiệp.",
          ". I understand that Agromind AI results are advisory only and do not replace advice from an agriculture expert.",
        )}
      </span>
    </label>
  );
}
