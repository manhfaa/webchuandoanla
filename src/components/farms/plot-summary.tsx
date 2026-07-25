"use client";

import { Check, MapPin, Pencil, QrCode, Trash2 } from "lucide-react";

import type { Tr } from "@/components/farms/farm-fields";
import { Badge } from "@/components/ui/badge";
import type { FarmPlot } from "@/lib/farmops-client";

export function PlotSummary({
  plot,
  active,
  qrCount,
  locationName,
  onSelect,
  onEdit,
  onDelete,
  tr,
}: {
  plot: FarmPlot;
  active: boolean;
  qrCount: number;
  locationName: string | null;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  tr: Tr;
}) {
  return (
    <div
      className={`rounded-lg border transition ${
        active ? "border-leaf/45 bg-surface-soft shadow-sm" : "border-line bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="w-full rounded-t-lg p-4 text-left text-ink transition hover:bg-surface-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{plot.name}</p>
            <p className="mt-1 text-body-sm text-ink-soft">
              {plot.crop_type} · {plot.growth_stage || tr("Đang theo dõi", "Being tracked")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="locked">
              {plot.logs?.length ?? 0} {tr("nhật ký", "logs")}
            </Badge>
            {qrCount ? (
              <Badge variant="locked">
                <QrCode strokeWidth={1.75} className="h-3 w-3" aria-hidden />
                {qrCount} {tr("mã QR", "QR codes")}
              </Badge>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-caption text-ink-soft">{plot.address_text || tr("Chưa ghi vị trí", "No location recorded")}</p>
        <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-soft">
          <MapPin strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
          {locationName
            ? tr(`Cảnh báo thời tiết theo: ${locationName}`, `Weather alerts from: ${locationName}`)
            : tr("Chưa gắn vị trí canh tác nên chưa có cảnh báo thời tiết", "No farm location linked, so no weather alerts yet")}
        </p>
        {active ? (
          <span className="mt-3 inline-flex items-center gap-1.5 text-caption font-semibold text-leaf-strong">
            <Check strokeWidth={2} className="h-3.5 w-3.5" aria-hidden />
            {tr("Đang xem lô này", "Currently viewing this plot")}
          </span>
        ) : null}
      </button>

      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-caption font-semibold text-ink transition hover:bg-surface-soft"
        >
          <Pencil strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
          {tr("Sửa", "Edit")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/30 px-3 text-caption font-semibold text-danger-ink transition hover:bg-danger-soft"
        >
          <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
          {tr("Xóa lô này", "Delete this plot")}
        </button>
      </div>
    </div>
  );
}
