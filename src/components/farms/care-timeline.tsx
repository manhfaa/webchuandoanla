"use client";

import Link from "next/link";
import { Microscope, Pencil, Trash2 } from "lucide-react";

import { activityLabel, type Tr } from "@/components/farms/farm-fields";
import { Badge } from "@/components/ui/badge";
import type { CultivationLog } from "@/lib/farmops-client";

export function CareTimeline({
  logs,
  editingLogId,
  diagnosisLabel,
  onEdit,
  onDelete,
  tr,
}: {
  logs: CultivationLog[];
  editingLogId: number | null;
  diagnosisLabel: (id: number) => string | null;
  onEdit: (log: CultivationLog) => void;
  onDelete: (log: CultivationLog) => void;
  tr: Tr;
}) {
  if (!logs.length) {
    return (
      <p className="text-body-sm text-ink-soft">{tr("Chưa có nhật ký cho lô này.", "No log for this plot yet.")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const linked = log.diagnosis ? diagnosisLabel(log.diagnosis) : null;
        return (
          <div
            key={log.id}
            className={`rounded-lg border bg-surface-soft p-4 transition ${
              editingLogId === log.id ? "border-leaf/45" : "border-line"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="locked">{activityLabel(log.activity_type, tr)}</Badge>
              <span className="text-caption text-ink-soft">{new Date(log.activity_date).toLocaleDateString("vi-VN")}</span>
              {editingLogId === log.id ? (
                <Badge variant="info">{tr("Đang sửa", "Editing")}</Badge>
              ) : null}
            </div>
            <p className="mt-3 font-semibold text-ink">{log.title}</p>
            <p className="mt-1 text-body-sm leading-relaxed text-ink-soft">{log.description}</p>

            {log.diagnosis ? (
              <Link
                href={`/dashboard/results/${log.diagnosis}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-caption font-semibold text-ink transition hover:bg-surface-soft"
              >
                <Microscope strokeWidth={1.75} className="h-3.5 w-3.5 text-leaf-strong" aria-hidden />
                {linked ?? tr(`Kết quả đã lưu #${log.diagnosis}`, `Saved result #${log.diagnosis}`)}
              </Link>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => onEdit(log)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-caption font-semibold text-ink transition hover:bg-surface"
              >
                <Pencil strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                {tr("Sửa", "Edit")}
              </button>
              <button
                type="button"
                onClick={() => onDelete(log)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/30 px-3 text-caption font-semibold text-danger-ink transition hover:bg-danger-soft"
              >
                <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                {tr("Xóa", "Delete")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
