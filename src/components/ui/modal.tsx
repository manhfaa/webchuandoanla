"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/use-tr";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest/70 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[71] w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 text-ink shadow-float",
          className,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-semibold">{title}</h3>
            {description ? (
              <p className="max-w-2xl text-sm text-ink-soft">{description}</p>
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
