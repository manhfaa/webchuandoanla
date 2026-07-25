"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTr } from "@/lib/use-tr";

/**
 * Confirmation step for actions the grower cannot undo. `consequences` is the
 * important part: it spells out everything that disappears alongside the thing
 * being deleted, so nobody loses a printed QR code by surprise.
 */
export function ConfirmDialog({
  open,
  tone = "danger",
  title,
  description,
  consequences = [],
  confirmLabel,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  tone?: "danger" | "neutral";
  title: string;
  description: string;
  consequences?: string[];
  confirmLabel: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tr = useTr();

  return (
    <Modal open={open} onClose={onCancel} title={title} description={description} className="max-w-lg">
      {consequences.length ? (
        <div
          className={`rounded-lg border p-4 ${
            tone === "danger" ? "border-danger/30 bg-danger-soft" : "border-line bg-surface-soft"
          }`}
        >
          <div className="flex items-center gap-2 text-body-sm font-semibold text-ink">
            <AlertTriangle strokeWidth={1.75} className="h-4 w-4" aria-hidden />
            {tone === "danger"
              ? tr("Những mục sau sẽ mất theo và không khôi phục được", "These will be destroyed with it and cannot be restored")
              : tr("Điều gì sẽ xảy ra", "What happens next")}
          </div>
          <ul className="mt-3 space-y-1.5 text-body-sm leading-relaxed text-ink-soft">
            {consequences.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-body-sm text-danger-ink">{error}</p> : null}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {tr("Giữ lại", "Keep it")}
        </Button>
        <Button
          type="button"
          variant={tone === "danger" ? "danger" : "primary"}
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
