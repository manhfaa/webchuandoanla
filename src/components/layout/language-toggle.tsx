"use client";

import { useLanguageStore } from "@/store/language-store";
import { cn } from "@/lib/utils";

/**
 * Cờ thay cho chữ "VI" / "EN".
 *
 * Cờ vẽ bằng SVG nội tuyến, không dùng emoji: Chrome trên Windows không có
 * font vẽ cờ quốc gia, nên emoji cờ hiện ra thành hai chữ cái viết hoa. Đó là
 * lỗi thật, không phải lo xa.
 *
 * Mỗi nút giữ 44×44 để đủ vùng chạm, và mang nhãn chữ cho trình đọc màn hình
 * vì một lá cờ không tự đọc được. Trạng thái đang chọn có thêm viền sáng quanh
 * cờ chứ không chỉ dựa vào màu con trượt, để người mù màu vẫn nhận ra.
 */

function FlagVietnam() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6" aria-hidden="true" focusable="false">
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,3 16.59,7.82 21.66,7.84 17.57,10.83 19.11,15.66 15,12.7 10.89,15.66 12.43,10.83 8.34,7.84 13.41,7.82"
        fill="#FFDE00"
      />
    </svg>
  );
}

function FlagUnitedKingdom() {
  return (
    <svg viewBox="0 0 60 30" className="h-4 w-6" aria-hidden="true" focusable="false">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <rect x="24" y="0" width="12" height="30" fill="#FFFFFF" />
      <rect x="0" y="9" width="60" height="12" fill="#FFFFFF" />
      <rect x="27" y="0" width="6" height="30" fill="#C8102E" />
      <rect x="0" y="12" width="60" height="6" fill="#C8102E" />
    </svg>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguageStore();
  const isEn = language === "en";

  const buttonClass = (active: boolean) =>
    cn(
      "relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-opacity duration-180",
      active ? "opacity-100" : "opacity-60 hover:opacity-90",
    );

  // Viền chọn dùng giá trị tuỳ ý: mọi màu trong tailwind.config là var() trần,
  // nên dạng ring-on-leaf/… sẽ bị compile thành rỗng.
  const flagClass = (active: boolean) =>
    cn("block overflow-hidden rounded-[3px]", active && "shadow-[0_0_0_2px_var(--on-leaf)]");

  return (
    <div
      role="group"
      aria-label="Ngôn ngữ / Language"
      className={cn(
        "relative inline-flex h-12 select-none items-center rounded-full border border-line bg-surface-soft p-0.5",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-leaf shadow-sm transition-transform duration-260 ease-out motion-reduce:transition-none",
          isEn && "translate-x-full",
        )}
      />
      <button type="button" onClick={() => setLanguage("vi")} aria-pressed={!isEn} className={buttonClass(!isEn)}>
        <span className={flagClass(!isEn)}>
          <FlagVietnam />
        </span>
        <span className="sr-only">Tiếng Việt</span>
      </button>
      <button type="button" onClick={() => setLanguage("en")} aria-pressed={isEn} className={buttonClass(isEn)}>
        <span className={flagClass(isEn)}>
          <FlagUnitedKingdom />
        </span>
        <span className="sr-only">English</span>
      </button>
    </div>
  );
}
