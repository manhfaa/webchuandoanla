"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/use-tr";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tr = useTr();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Portalled, so `document.body` has to exist first.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape to dismiss, focus moved into the dialog, focus kept inside while it
  // is open, and focus restored to the trigger on close (WCAG 2.1.2 / 2.4.3).
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Rendered into <body> rather than in place. Dashboard pages animate their
  // children (`.fl-stagger > *` runs fl-rise-in with fill mode `both`, so the
  // transform never goes away), and a transformed ancestor becomes the
  // containing block for `position: fixed` — which silently turned `inset-0`
  // from "the viewport" into "inside that animated element". The dialog ended up
  // offset and taller than the screen with its top and bottom unreachable.
  return createPortal(
    // `bg-forest/70` compiled to nothing: colour tokens are bare `var(--token)`
    // with no <alpha-value>, so the modifier produced invalid CSS that Tailwind
    // dropped. The scrim was simply absent and only the blur separated the
    // dialog from the page behind it. color-mix() is the working form.
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[color-mix(in_srgb,var(--forest)_70%,transparent)] p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          // Without a height cap and its own scroller, tall content — the plan
          // grid is four cards with feature lists — overflows a centred dialog
          // in both directions at once, so the top and bottom are simply
          // unreachable. dvh, not vh, so a mobile browser's collapsing toolbar
          // does not hide the close button.
          "relative z-[71] flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-6 text-ink shadow-float focus:outline-none",
          className,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 id={titleId} className="font-display text-2xl font-semibold">{title}</h3>
            {description ? (
              <p id={descriptionId} className="max-w-2xl text-sm text-ink-soft">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            // 44x44 minimum. At `p-2` around an 18px icon this was a 34px
            // target — below the threshold for a thumb, and it is the only way
            // out of a dialog for anyone not using a keyboard.
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-surface-soft hover:text-ink"
            aria-label={tr("Đóng", "Close")}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
