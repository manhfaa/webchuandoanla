"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTr } from "@/lib/use-tr";

/**
 * Confirmation for the crop-plan actions that destroy work. `consequences` is
 * the list of things the grower also loses, spelled out before they commit.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  consequences = [],
  confirmLabel,
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  consequences?: string[];
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tr = useTr();

  return (
    <Modal open={open} onClose={onCancel} title={title} description={description} className="max-w-lg">
      {consequences.length ? (
        <ul className="space-y-2 rounded-lg border border-sun/30 bg-sun-soft p-4 text-sm leading-7 text-ink">
          {consequences.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          {tr("Hủy", "Cancel")}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={pending} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
