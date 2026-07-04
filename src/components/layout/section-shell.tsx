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
    <section
      id={id}
      className={cn(
        "px-4 py-20 transition-colors duration-300 sm:px-6 lg:px-8",
        "dark:bg-[#04180f] dark:text-emerald-50",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 max-w-3xl">
          {eyebrow ? (
            <div className="mb-4 inline-flex rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-800 dark:border dark:border-white/10 dark:bg-white/10 dark:text-lime-100">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-emerald-50/75">{description}</p>
          ) : null}
        </Reveal>
        <div className={contentClassName}>{children}</div>
      </div>
    </section>
  );
}
