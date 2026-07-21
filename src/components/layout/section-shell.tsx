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
    <section id={id} className={cn("px-4 py-20 sm:px-6 lg:px-8 lg:py-24", className)}>
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 max-w-4xl">
          {eyebrow ? (
            <div className="mb-4 inline-flex rounded-full border border-line bg-surface-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="max-w-3xl font-display text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
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
