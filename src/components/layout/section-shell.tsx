import { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    // The navbar is `fixed` (navbar.tsx:32) and roughly 68px tall on mobile,
    // 76px from md up. Two of the five contract nav anchors land here —
    // #tinh-nang and #goi-dich-vu — and had no scroll offset at all, so their
    // headings arrived underneath the navbar. The other landing sections each
    // carry their own scroll-mt-*; this gives the shared shell the same.
    <section id={id} className={cn("scroll-mt-[68px] px-4 py-16 sm:px-6 md:scroll-mt-[76px] lg:px-8 lg:py-20", className)}>
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-9 max-w-4xl">
          {eyebrow ? (
            <div className="mb-4 inline-flex rounded-full border border-line bg-surface-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="max-w-3xl font-display text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl lg:text-[40px] lg:leading-[1.15]">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">{description}</p>
          ) : null}
        </Reveal>
        <div className={contentClassName}>{children}</div>
      </div>
    </section>
  );
}
