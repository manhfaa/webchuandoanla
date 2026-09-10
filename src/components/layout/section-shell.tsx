import { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

/**
 * Section header in the manner of a technical manual: a numbered kicker on a
 * hairline, then the title on the left and the standfirst on the right. The
 * number is cosmetic — it orders the page for a reader skimming it, nothing
 * reads it back — so sections that render their own header (the two scroll
 * pieces) print the same kicker by hand.
 */
export function SectionShell({
  id,
  number,
  eyebrow,
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  id?: string;
  number?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    // The navbar is `fixed` and 64px tall. Two of the contract nav anchors land
    // here — #tinh-nang and #goi-dich-vu — so the shell carries the same scroll
    // offset the other landing sections do.
    <section id={id} className={cn("scroll-mt-[68px] px-4 py-16 sm:px-6 md:scroll-mt-[76px] lg:px-8 lg:py-24", className)}>
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 border-t border-line pt-5 lg:mb-12">
          {eyebrow || number ? (
            <p className="kicker">
              {number ? <span className="tabular-nums">{number}</span> : null}
              {eyebrow ? <span>{eyebrow}</span> : null}
            </p>
          ) : null}
          <div className="mt-6 grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-8">
            <h2 className="font-display text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl lg:col-span-7 lg:text-[40px] lg:leading-[1.12]">
              {title}
            </h2>
            {description ? (
              <p className="max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8 lg:col-span-5 lg:pb-1">{description}</p>
            ) : null}
          </div>
        </Reveal>
        <div className={contentClassName}>{children}</div>
      </div>
    </section>
  );
}
