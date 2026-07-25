"use client";

import { FormEvent, useState } from "react";
import { ExternalLink, Eye, EyeOff, Pencil, QrCode, Trash2 } from "lucide-react";

import type { Tr } from "@/components/farms/farm-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TraceabilityDisplaySettings, TraceabilityRecord } from "@/lib/farmops-client";

/** Records created before these flags existed publish everything, same as the backend default. */
function settingsOf(record: TraceabilityRecord): TraceabilityDisplaySettings {
  const stored = record.public_settings ?? {};
  return {
    show_logs: stored.show_logs ?? true,
    show_region: stored.show_region ?? true,
    show_planting_date: stored.show_planting_date ?? true,
    show_growth_stage: stored.show_growth_stage ?? true,
  };
}

const ALL_VISIBLE: TraceabilityDisplaySettings = {
  show_logs: true,
  show_region: true,
  show_planting_date: true,
  show_growth_stage: true,
};

function displayFields(tr: Tr): Array<{ key: keyof TraceabilityDisplaySettings; label: string; hiddenLabel: string }> {
  return [
    {
      key: "show_logs",
      label: tr("Dòng thời gian chăm sóc", "Care timeline"),
      hiddenLabel: tr("Ẩn nhật ký", "Timeline hidden"),
    },
    {
      key: "show_region",
      label: tr("Khu vực trồng", "Growing area"),
      hiddenLabel: tr("Ẩn khu vực", "Area hidden"),
    },
    {
      key: "show_planting_date",
      label: tr("Ngày xuống giống", "Planting date"),
      hiddenLabel: tr("Ẩn ngày xuống giống", "Planting date hidden"),
    },
    {
      key: "show_growth_stage",
      label: tr("Giai đoạn sinh trưởng", "Growth stage"),
      hiddenLabel: tr("Ẩn giai đoạn", "Growth stage hidden"),
    },
  ];
}

export function TraceabilityPanel({
  records,
  defaultProductName,
  plotSelected,
  submitting,
  busyRecordId,
  error,
  onCreate,
  onUpdate,
  onTogglePublic,
  onDelete,
  tr,
}: {
  records: TraceabilityRecord[];
  defaultProductName: string;
  plotSelected: boolean;
  submitting: boolean;
  busyRecordId: number | null;
  error: string | null;
  onCreate: (productName: string, settings: TraceabilityDisplaySettings) => void;
  onUpdate: (record: TraceabilityRecord, productName: string, settings: TraceabilityDisplaySettings) => void;
  onTogglePublic: (record: TraceabilityRecord) => void;
  onDelete: (record: TraceabilityRecord) => void;
  tr: Tr;
}) {
  const [productName, setProductName] = useState(defaultProductName);
  const [settings, setSettings] = useState<TraceabilityDisplaySettings>(ALL_VISIBLE);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<number[]>([]);

  const fields = displayFields(tr);
  const editingRecord = records.find((record) => record.id === editingRecordId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = productName.trim() || defaultProductName;
    if (editingRecord) {
      onUpdate(editingRecord, name, settings);
      return;
    }
    onCreate(name, settings);
  }

  function startEdit(record: TraceabilityRecord) {
    setEditingRecordId(record.id);
    setProductName(record.product_name);
    setSettings(settingsOf(record));
  }

  function cancelEdit() {
    setEditingRecordId(null);
    setProductName(defaultProductName);
    setSettings(ALL_VISIBLE);
  }

  const submitLabel = editingRecord
    ? tr("Lưu mã QR", "Save QR code")
    : records.length
      ? tr("Phát hành thêm mã QR", "Issue another QR code")
      : tr("Tạo QR truy xuất", "Create QR");

  return (
    <>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <Input
          label={tr("Tên sản phẩm công khai", "Public product name")}
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          hint={
            editingRecord
              ? tr("Thay đổi sẽ áp dụng cho mã đang sửa.", "Changes apply to the code you are editing.")
              : records.length
                ? tr("Lô này đã có mã QR. Mỗi lần phát hành thêm sẽ tạo một đường dẫn công khai mới.", "This plot already has a QR code. Issuing another one creates a new public link.")
                : undefined
          }
        />

        <fieldset className="rounded-lg border border-line bg-surface-soft p-4">
          <legend className="px-1 text-body-sm font-semibold text-ink">
            {tr("Hiển thị trên trang công khai", "Shown on the public page")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className="flex items-center gap-2 text-body-sm text-ink">
                <input
                  type="checkbox"
                  checked={settings[field.key]}
                  onChange={(event) => setSettings({ ...settings, [field.key]: event.target.checked })}
                  className="h-4 w-4 rounded border-line text-leaf focus:ring-2 focus:ring-leaf/25"
                />
                {field.label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-caption text-ink-soft">
            {tr(
              "Tên sản phẩm, cây trồng và tên lô luôn hiển thị. Chi phí và vật tư không bao giờ được công khai.",
              "Product name, crop and plot name are always shown. Costs and materials are never published.",
            )}
          </p>
        </fieldset>

        {error ? <p className="text-body-sm text-danger-ink">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={submitting} disabled={!plotSelected || submitting}>
            <QrCode strokeWidth={1.75} className="h-4 w-4" />
            {submitLabel}
          </Button>
          {editingRecord ? (
            <Button type="button" variant="secondary" onClick={cancelEdit} disabled={submitting}>
              {tr("Hủy", "Cancel")}
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-5 space-y-4">
        {!plotSelected ? (
          <p className="text-body-sm text-ink-soft">{tr("Hãy chọn một lô vườn trước.", "Please select a plot first.")}</p>
        ) : records.length ? (
          records.map((record) => {
            const recordSettings = settingsOf(record);
            const hidden = fields.filter((field) => !recordSettings[field.key]);
            return (
              <div
                key={record.id}
                className={`rounded-lg border bg-surface-soft p-4 ${
                  editingRecordId === record.id ? "border-leaf/45" : "border-line"
                }`}
              >
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  {brokenImages.includes(record.id) ? (
                    <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong/60 bg-surface p-3 text-center">
                      <QrCode strokeWidth={1.5} className="h-6 w-6 text-ink-soft" aria-hidden />
                      <p className="text-caption text-ink-soft">
                        {tr("Chưa hiển thị được ảnh mã QR. Đường dẫn bên cạnh vẫn dùng được.", "The QR image could not load. The link beside it still works.")}
                      </p>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={record.qr_image_url}
                      alt={tr(`QR truy xuất ${record.product_name}`, `Traceability QR code for ${record.product_name}`)}
                      onError={() => setBrokenImages((current) => (current.includes(record.id) ? current : [...current, record.id]))}
                      className="h-[180px] w-[180px] rounded-md bg-qr-paper p-2"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{record.product_name}</p>
                      <Badge variant={record.is_public ? "success" : "warning"}>
                        {record.is_public ? tr("Đang công khai", "Published") : tr("Đã ẩn", "Unpublished")}
                      </Badge>
                      {hidden.map((field) => (
                        <Badge key={field.key} variant="locked">
                          {field.hiddenLabel}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 break-all text-body-sm leading-relaxed text-ink-soft">{record.public_url}</p>
                    {!record.is_public ? (
                      <p className="mt-2 text-caption text-warning-ink">
                        {tr(
                          "Mã QR đã in hiện không mở được. Bấm “Công khai lại” để bật lại đường dẫn này.",
                          "Printed copies of this code do not open right now. Use “Publish again” to turn the link back on.",
                        )}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {record.is_public ? (
                        <a
                          href={record.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-body-sm font-medium text-ink transition hover:bg-surface-soft"
                        >
                          <ExternalLink strokeWidth={1.75} className="h-4 w-4" aria-hidden />
                          {tr("Mở trang công khai", "Open public page")}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => startEdit(record)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-caption font-semibold text-ink transition hover:bg-surface-soft"
                      >
                        <Pencil strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                        {tr("Sửa mã này", "Edit this code")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePublic(record)}
                        disabled={busyRecordId === record.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-caption font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-60"
                      >
                        {record.is_public ? (
                          <EyeOff strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Eye strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {record.is_public ? tr("Ngừng công khai", "Unpublish") : tr("Công khai lại", "Publish again")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(record)}
                        disabled={busyRecordId === record.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/30 px-3 text-caption font-semibold text-danger-ink transition hover:bg-danger-soft disabled:opacity-60"
                      >
                        <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
                        {tr("Xóa mã", "Delete code")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-body-sm text-ink-soft">
            {tr("Lô này chưa có mã QR truy xuất nào.", "This plot has no traceability QR code yet.")}
          </p>
        )}
      </div>
    </>
  );
}
