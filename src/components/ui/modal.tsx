"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[71] w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#10231c] p-6 text-white shadow-float",
          className,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-semibold">{title}</h3>
            {description ? (
              <p className="max-w-2xl text-sm text-emerald-50/75">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
