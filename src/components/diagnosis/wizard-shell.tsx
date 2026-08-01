"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";

import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

export type WizardStepId = "crop" | "photo" | "symptoms" | "result";

export const WIZARD_STEPS: { id: WizardStepId; label: string; labelEn: string }[] = [
  { id: "crop", label: "Cây trồng", labelEn: "Crop" },
  { id: "photo", label: "Ảnh lá", labelEn: "Leaf photo" },
  { id: "symptoms", label: "Triệu chứng", labelEn: "Symptoms" },
  { id: "result", label: "Kết quả", labelEn: "Result" },
];

/**
 * One step on screen at a time.
 *
 * The diagnosis page used to stack every stage in a single column: crop, upload,
 * camera, tips, leaf stats, symptom form and result all mounted at once. On a
 * phone that is roughly six screens of scrolling to complete one check, and the
 * grower has to work out for themselves which part is currently theirs to act
 * on. Here the shell owns the frame — progress, title, actions — and the page
 * hands it only the body for the active step.
 */
export function WizardShell({
  step,
  title,
  description,
  children,
  footer,
  aside,
}: {
  step: WizardStepId;
  title: string;
  description?: string;
  children: ReactNode;
  /** Primary/secondary actions. Pinned to the bottom edge on phones. */
  footer?: ReactNode;
  /** Small contextual chips (quota, connection) shown beside the progress row. */
  aside?: ReactNode;
}) {
  const tr = useTr();
  const activeIndex = WIZARD_STEPS.findIndex((item) => item.id === step);
  const rootRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<WizardStepId | null>(null);

  // Bring the new step to the top of the viewport the moment it replaces the old
  // one. Without this the step swaps in place: a grower who had scrolled down to
  // reach the button that advanced them is still scrolled down afterwards, so
  // the next step is off screen and they have to scroll back up to find work
  // that is already waiting for them.
  //
  // Skipped on the very first step the component sees, because yanking the page
  // on arrival is disorienting and there is nothing above to scroll past yet.
  useEffect(() => {
    const first = seenRef.current === null;
    const changed = seenRef.current !== step;
    seenRef.current = step;
    if (first || !changed) return;

    const node = rootRef.current;
    if (!node) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Move focus to the step heading too, so a screen-reader or keyboard user is
    // told what changed instead of being left wherever the old button was.
    const heading = node.querySelector<HTMLElement>("[data-step-heading]");
    heading?.focus({ preventScroll: true });
  }, [step]);

  return (
    <div ref={rootRef} className="flex min-h-[calc(100dvh-11rem)] scroll-mt-4 flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ol className="flex w-full items-center gap-1.5 sm:w-auto" aria-label={tr("Tiến trình kiểm tra", "Check progress")}>
          {WIZARD_STEPS.map((item, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <li key={item.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-none">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition",
                    done && "border-leaf bg-leaf text-on-leaf",
                    active && "border-leaf bg-[color-mix(in_srgb,var(--leaf)_14%,transparent)] text-leaf-strong",
                    !done && !active && "border-line bg-surface text-ink-muted",
                  )}
                >
                  {done ? <Check size={14} aria-hidden /> : index + 1}
                </span>
                {/* Labels would wrap and blow the row apart at 390px, so on a
                    phone only the current step is named. */}
                <span
                  className={cn(
                    "truncate text-xs font-semibold",
                    active ? "text-ink" : "hidden sm:inline text-ink-muted",
                  )}
                >
                  {tr(item.label, item.labelEn)}
                </span>
                {index < WIZARD_STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "h-px min-w-3 flex-1 sm:w-6 sm:flex-none",
                      done ? "bg-leaf" : "bg-line",
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
        {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
      </div>

      <div className="flex flex-1 flex-col rounded-[var(--r-xl)] border border-line bg-surface-raised p-4 shadow-sm sm:p-6">
        <div>
          {/* tabIndex -1 so focus can be moved here on a step change without
              putting the heading into the tab order. */}
          <h2
            data-step-heading
            tabIndex={-1}
            className="font-display text-2xl font-bold tracking-[-0.03em] text-ink outline-none sm:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{description}</p>
          ) : null}
        </div>

        <div className="mt-5 flex-1">{children}</div>

        {footer ? (
          // Actions sit at the end of the step's own card rather than in a fixed
          // page-level bar: the bar is shared by every dashboard screen and
          // cannot know which of this step's actions is currently valid.
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
