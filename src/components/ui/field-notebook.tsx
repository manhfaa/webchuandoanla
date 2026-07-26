"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Field Notebook — bộ nguyên thủy hình ảnh cho Agromind AI V2.

   Thay thế cho "icon 44x44 bo góc trên nền surface-soft + tiêu đề + 2 dòng",
   đơn vị đang lặp ~50 lần và làm giao diện giống template AI phổ thông.

   Nguyên tắc: nội dung nằm TRÊN dòng kẻ, không nằm TRONG hộp.
   Mọi màu đều qua token, không hard-code hex.
   ============================================================================ */

/* ── PlateNumber ───────────────────────────────────────────────────────────
   Số hiệu mono cỡ lớn, thay cho icon chip. Dùng ở quy trình (01–04),
   tin cậy (01–03), stepper chẩn đoán. */
export function PlateNumber({
  n,
  tone = "leaf",
  size = "md",
  className,
}: {
  n: number | string;
  tone?: "leaf" | "soil" | "ink" | "on-panel";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = typeof n === "number" ? String(n).padStart(2, "0") : n;
  return (
    <span
      aria-hidden
      className={cn(
        "font-mono font-semibold leading-none tabular-nums",
        size === "sm" && "text-sm tracking-[0.06em]",
        size === "md" && "text-2xl tracking-[0.02em] sm:text-[28px]",
        size === "lg" && "text-[28px] tracking-[0.02em] sm:text-[34px]",
        tone === "leaf" && "text-leaf",
        tone === "soil" && "text-soil",
        tone === "ink" && "text-ink",
        tone === "on-panel" && "text-on-panel-ink",
        className,
      )}
    >
      {label}
    </span>
  );
}

/* ── SpecimenLabel ─────────────────────────────────────────────────────────
   Nhãn mẫu vật: khối chữ nhật radius 4px (KHÔNG pill), mã mono ASCII.
   Ví dụ: <SpecimenLabel code="MAU 01 · 23.07" /> */
export function SpecimenLabel({
  code,
  tone = "paper",
  className,
}: {
  code: string;
  tone?: "paper" | "soil" | "leaf" | "panel";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
        tone === "paper" && "border border-line bg-surface text-ink-soft",
        tone === "soil" && "border border-soil/35 bg-soil/10 text-soil",
        tone === "leaf" && "border border-leaf/35 bg-leaf/10 text-leaf-strong",
        tone === "panel" && "border border-on-panel-ink/25 bg-on-panel-ink/10 text-on-panel-ink",
        className,
      )}
    >
      {code}
    </span>
  );
}

/* ── SectionTab ────────────────────────────────────────────────────────────
   Tab chỉ mục mở đầu section, như tab phân trang sổ tay.
   Thay cho pill eyebrow căn giữa/căn trái đều tăm tắp. */
export function SectionTab({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end", className)}>
      <span className="inline-flex items-center gap-2 rounded-t-[6px] border-x border-t border-line bg-surface-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-leaf-strong">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-leaf" />
        {children}
      </span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

/* ── NotebookSection ───────────────────────────────────────────────────────
   Vỏ section theo hệ V2: container 1440, tab chỉ mục, heading, mô tả.
   Dùng cho các section landing đã chuyển sang hệ sổ tay. */
export function NotebookSection({
  id,
  tab,
  title,
  description,
  aside,
  children,
  className,
  headerClassName,
}: {
  id?: string;
  tab?: string;
  title: string;
  description?: string;
  /** Nội dung phụ nằm bên phải heading (ở >=lg), tạo nhịp bất đối xứng. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 px-5 py-[72px] sm:px-6 md:py-24 lg:px-8 lg:py-[120px]", className)}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className={cn("mb-10 lg:mb-14", headerClassName)}>
          {tab ? <SectionTab className="mb-6">{tab}</SectionTab> : null}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
            <div>
              <h2 className="max-w-[22ch] text-balance font-display text-[28px] font-extrabold leading-[1.12] tracking-[-0.04em] text-ink sm:text-[34px] md:text-[40px] lg:text-[46px] lg:leading-[1.08]">
                {title}
              </h2>
              {description ? (
                <p className="mt-4 max-w-[62ch] text-pretty text-[15.5px] leading-[1.7] text-ink-soft sm:text-base lg:text-[17px]">
                  {description}
                </p>
              ) : null}
            </div>
            {aside ? <div className="lg:pb-1">{aside}</div> : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ── HairlineRegister ──────────────────────────────────────────────────────
   Hàng nội dung trên dòng kẻ 1px. Thay cho card bo góc có icon chip.
   Nếu có href, cả hàng thành link (kèm mũi tên — mũi tên chỉ xuất hiện khi
   thật sự dẫn tới route). */
export function HairlineRegister({
  index,
  title,
  body,
  note,
  href,
  tone = "leaf",
  className,
}: {
  index?: number | string;
  title: string;
  body?: string;
  /** Ghi chú lề mono — chỉ nên chứa ASCII/số. */
  note?: string;
  href?: string;
  tone?: "leaf" | "soil";
  className?: string;
}) {
  const inner = (
    <>
      {index !== undefined ? (
        <span className="pt-0.5">
          <PlateNumber n={index} tone={tone} size="md" />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[19px] font-bold leading-[1.25] tracking-[-0.02em] text-ink sm:text-xl">
            {title}
          </span>
          {note ? (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
              {note}
            </span>
          ) : null}
        </span>
        {body ? (
          <span className="mt-2 block max-w-[62ch] text-pretty text-[14.5px] leading-[1.65] text-ink-soft">
            {body}
          </span>
        ) : null}
      </span>
      {href ? (
        <ArrowRight
          size={17}
          aria-hidden
          className="mt-1 shrink-0 text-ink-soft transition duration-180 group-hover:translate-x-1 group-hover:text-leaf-strong"
        />
      ) : null}
    </>
  );

  const shell = cn(
    "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-5 gap-y-2 border-t border-paper-rule py-6 first:border-t-0 sm:py-7",
    href && "group cursor-pointer transition duration-180 hover:border-leaf/40",
    href && index !== undefined && "grid-cols-[auto_minmax(0,1fr)_auto]",
    !href && index === undefined && "grid-cols-1",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        )}
      >
        {inner}
      </Link>
    );
  }

  return <div className={shell}>{inner}</div>;
}

/* ── MarginNote ────────────────────────────────────────────────────────────
   Chú thích lề. Ở >=lg nằm trong cột lề hẹp; ở <lg gộp vào flow. */
export function MarginNote({
  label,
  children,
  className,
}: {
  /** Nhãn ASCII ngắn, hiển thị bằng mono. */
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "border-l-2 border-paper-rule pl-4 text-[13px] leading-[1.6] text-ink-soft lg:border-l-0 lg:border-t-2 lg:pl-0 lg:pt-3",
        className,
      )}
    >
      {label ? (
        <span className="mb-1.5 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-soil">
          {label}
        </span>
      ) : null}
      {children}
    </aside>
  );
}

/* ── PaperStack ────────────────────────────────────────────────────────────
   Chiều sâu bằng ĐỘ LỆCH của lớp giấy phía sau, không bằng shadow lớn.
   offset: px lệch của lớp giấy (12–24 theo hệ thống). */
export function PaperStack({
  children,
  offset = 20,
  from = "right",
  className,
}: {
  children: ReactNode;
  offset?: number;
  from?: "right" | "left";
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-[var(--r-2xl)] border border-line bg-surface-soft"
        style={{
          top: -offset * 0.6,
          bottom: offset * 0.8,
          left: from === "right" ? offset * 1.2 : -offset,
          right: from === "right" ? -offset : offset * 1.2,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ── InkPanel ──────────────────────────────────────────────────────────────
   Panel nhấn. LUÔN dùng cái này thay cho `bg-forest` trực tiếp: ở dark mode
   nó tự chuyển sang surface-raised + border leaf nên không tan vào nền. */
export function InkPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-2xl)] border border-panel-ink-border bg-panel-ink text-on-panel-ink shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── VeinGlyph ─────────────────────────────────────────────────────────────
   4 trạng thái sinh trưởng: mầm -> lá non -> gân phân nhánh -> lá hoàn chỉnh.
   SVG stroke 1px, không dùng icon library. Trang trí => aria-hidden. */
export function VeinGlyph({
  stage,
  size = 32,
  className,
}: {
  stage: 1 | 2 | 3 | 4;
  size?: number;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={cn("text-leaf", className)}
    >
      {stage === 1 ? (
        <>
          <path d="M16 27V15" {...common} />
          <path d="M16 15c0-4-3-6-6-6 0 4 2 6 6 6Z" {...common} className="fill-mint" />
          <path d="M9 27h14" {...common} />
        </>
      ) : null}
      {stage === 2 ? (
        <>
          <path d="M16 27V12" {...common} />
          <path d="M16 12c-1-6-6-8-10-7 1 6 5 8 10 7Z" {...common} className="fill-mint" />
          <path d="M16 18c1-4 5-6 9-5-1 4-4 6-9 5Z" {...common} className="fill-mint" />
        </>
      ) : null}
      {stage === 3 ? (
        <>
          <path d="M16 27V6" {...common} />
          <path d="M16 10 9 15M16 10l7 5M16 16l-6 4M16 16l6 4M16 22l-4 3M16 22l4 3" {...common} />
        </>
      ) : null}
      {stage === 4 ? (
        <>
          <path
            d="M16 5C8 9 4 17 6 24c4 3 9 3 10 3s6 0 10-3c2-7-2-15-10-19Z"
            {...common}
            className="fill-mint/60"
          />
          <path d="M16 9v18M16 14l-5 4M16 14l5 4M16 20l-4 3M16 20l4 3" {...common} />
        </>
      ) : null}
    </svg>
  );
}
