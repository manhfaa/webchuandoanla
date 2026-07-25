"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ExternalLink } from "lucide-react";

import { ACTIVITY_TYPES, activityLabel, EARLIEST_FARM_DATE, latestFarmDate } from "@/components/farms/farm-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CultivationLog } from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";

export type DiagnosisOption = {
  id: string;
  label: string;
};

export type LogFormValues = {
  activity_type: string;
  activity_date: string;
  title: string;
  description: string;
  diagnosis: string;
};

export function logToFormValues(log: CultivationLog): LogFormValues {
  return {
    activity_type: log.activity_type,
    activity_date: log.activity_date,
    title: log.title,
    description: log.description,
    diagnosis: log.diagnosis ? String(log.diagnosis) : "",
  };
}

export function LogForm({
  mode,
  initialValues,
  diagnoses,
  diagnosesUnavailable,
  submitting,
  disabled,
  error,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initialValues: LogFormValues;
  diagnoses: DiagnosisOption[];
  diagnosesUnavailable: boolean;
  submitting: boolean;
  disabled: boolean;
  error: string | null;
  onSubmit: (values: LogFormValues) => void;
  onCancel?: () => void;
}) {
  const tr = useTr();
  const [values, setValues] = useState(initialValues);

  function update(patch: Partial<LogFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  // A log edited on this page may point at a result that is no longer in the
  // list; keep it selectable so saving does not silently unlink it.
  const missingSelection = values.diagnosis && !diagnoses.some((item) => item.id === values.diagnosis);

  return (
    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-body-sm font-semibold text-ink">{tr("Loại hoạt động", "Activity type")}</span>
          <select
            value={values.activity_type}
            onChange={(e) => update({ activity_type: e.target.value })}
            className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {activityLabel(type, tr)}
              </option>
            ))}
          </select>
        </label>
        <Input
          label={tr("Ngày ghi", "Log date")}
          type="date"
          min={EARLIEST_FARM_DATE}
          max={latestFarmDate()}
          value={values.activity_date}
          onChange={(e) => update({ activity_date: e.target.value })}
        />
        <Input label={tr("Tiêu đề", "Title")} value={values.title} onChange={(e) => update({ title: e.target.value })} />
        <label className="space-y-1.5">
          <span className="text-body-sm font-semibold text-ink">{tr("Kết quả kiểm tra ảnh đã lưu", "Saved image check")}</span>
          <select
            value={values.diagnosis}
            onChange={(e) => update({ diagnosis: e.target.value })}
            className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          >
            <option value="">{tr("Không liên kết", "Not linked")}</option>
            {missingSelection ? (
              <option value={values.diagnosis}>{tr(`Kết quả #${values.diagnosis}`, `Result #${values.diagnosis}`)}</option>
            ) : null}
            {diagnoses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {values.diagnosis ? (
            <Link
              href={`/dashboard/results/${values.diagnosis}`}
              className="inline-flex items-center gap-1.5 text-caption font-semibold text-leaf-strong hover:underline"
            >
              <ExternalLink strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
              {tr("Xem kết quả đang liên kết", "Open the linked result")}
            </Link>
          ) : (
            <p className="text-caption text-ink-soft">
              {diagnosesUnavailable
                ? tr("Chưa tải được danh sách kết quả đã lưu.", "Could not load your saved results.")
                : diagnoses.length
                  ? tr(
                      "Chọn một lần kiểm tra ảnh để gắn vào hoạt động này.",
                      "Pick a saved image check to attach to this activity.",
                    )
                  : tr("Bạn chưa lưu kết quả kiểm tra ảnh nào.", "You have not saved any image check yet.")}
            </p>
          )}
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-body-sm font-semibold text-ink">{tr("Mô tả", "Description")}</span>
        <textarea
          value={values.description}
          onChange={(e) => update({ description: e.target.value })}
          className="min-h-[120px] w-full rounded-md border border-line bg-surface-soft px-3.5 py-3 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        />
      </label>

      {error ? <p className="text-body-sm text-danger-ink">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting} disabled={disabled || submitting}>
          {mode === "edit" ? tr("Lưu nhật ký", "Save log") : tr("Ghi nhật ký", "Add log")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            {tr("Hủy", "Cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
