"use client";

import { useEffect, useId, useRef } from "react";
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest/70 p-4 backdrop-blur-sm">
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
          "relative z-[71] w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 text-ink shadow-float focus:outline-none",
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
            className="rounded-full border border-line p-2 text-ink-soft transition hover:bg-surface-soft hover:text-ink"
            aria-label={tr("Đóng", "Close")}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
