"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Sprout } from "lucide-react";

import { EARLIEST_FARM_DATE, latestFarmDate } from "@/components/farms/farm-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FARM_PLOT_AREA_UNITS, type FarmLocation, type FarmPlot, type FarmPlotAreaUnit } from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";

export type PlotFormValues = {
  name: string;
  crop_type: string;
  location: string;
  area_value: string;
  area_unit: string;
  address_text: string;
  planting_start_date: string;
  growth_stage: string;
  note: string;
};

export function plotToFormValues(plot: FarmPlot): PlotFormValues {
  return {
    name: plot.name,
    crop_type: plot.crop_type,
    location: plot.location ? String(plot.location) : "",
    area_value: plot.area_value ? String(Number(plot.area_value)) : "",
    area_unit: plot.area_unit,
    address_text: plot.address_text,
    planting_start_date: plot.planting_start_date ?? "",
    growth_stage: plot.growth_stage,
    note: plot.note,
  };
}

export function PlotForm({
  mode,
  initialValues,
  locations,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initialValues: PlotFormValues;
  locations: FarmLocation[];
  submitting: boolean;
  error: string | null;
  onSubmit: (values: PlotFormValues) => void;
  onCancel?: () => void;
}) {
  const tr = useTr();
  const [values, setValues] = useState(initialValues);

  function update(patch: Partial<PlotFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label={tr("Tên lô/vườn/ruộng", "Plot / garden / field name")} value={values.name} onChange={(e) => update({ name: e.target.value })} />
        <Input label={tr("Cây trồng", "Crop")} value={values.crop_type} onChange={(e) => update({ crop_type: e.target.value })} />
        <Input label={tr("Diện tích", "Area")} type="number" min="0" value={values.area_value} onChange={(e) => update({ area_value: e.target.value })} />
        <label className="space-y-1.5">
          <span className="text-body-sm font-semibold text-ink">{tr("Đơn vị", "Unit")}</span>
          <select
            value={values.area_unit}
            onChange={(e) => update({ area_unit: e.target.value })}
            className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          >
            {/* Plots saved before the unit list existed keep their own spelling. */}
            {FARM_PLOT_AREA_UNITS.includes(values.area_unit as FarmPlotAreaUnit) ? null : (
              <option value={values.area_unit}>{values.area_unit || tr("Chưa chọn", "Not set")}</option>
            )}
            <option value="m2">{tr("m² (mét vuông)", "m² (square metres)")}</option>
            <option value="ha">{tr("ha (héc ta)", "ha (hectares)")}</option>
            <option value="sào">{tr("sào", "sào")}</option>
            <option value="công">{tr("công", "công")}</option>
          </select>
        </label>
        <Input
          label={tr("Ngày xuống giống", "Planting date")}
          type="date"
          min={EARLIEST_FARM_DATE}
          max={latestFarmDate()}
          value={values.planting_start_date}
          onChange={(e) => update({ planting_start_date: e.target.value })}
        />
        <Input label={tr("Giai đoạn", "Growth stage")} value={values.growth_stage} onChange={(e) => update({ growth_stage: e.target.value })} />
      </div>
      <Input label={tr("Vị trí", "Location")} value={values.address_text} onChange={(e) => update({ address_text: e.target.value })} />
      <label className="block space-y-1.5">
        <span className="text-body-sm font-semibold text-ink">{tr("Vị trí canh tác đã lưu", "Saved farm location")}</span>
        <select
          value={values.location}
          onChange={(e) => update({ location: e.target.value })}
          className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        >
          <option value="">{tr("Chưa gắn vị trí", "Not linked")}</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {[location.name, location.province].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
        {locations.length ? (
          <p className="text-caption text-ink-soft">
            {tr(
              "Gắn vị trí để lô này nhận cảnh báo thời tiết và sâu bệnh theo toạ độ thật.",
              "Link a location so this plot receives weather and pest alerts for its real coordinates.",
            )}
          </p>
        ) : (
          <p className="text-caption text-ink-soft">
            {tr("Bạn chưa lưu vị trí canh tác nào. ", "You have not saved a farm location yet. ")}
            <Link href="/dashboard/weather-alerts" className="font-semibold text-leaf-strong hover:underline">
              {tr("Thêm ở mục Thời tiết & cảnh báo", "Add one in Weather & alerts")}
            </Link>
          </p>
        )}
      </label>
      <label className="block space-y-1.5">
        <span className="text-body-sm font-semibold text-ink">{tr("Ghi chú", "Note")}</span>
        <textarea
          value={values.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder={tr("Giống, nguồn nước, lưu ý riêng của lô này…", "Variety, water source, anything specific to this plot…")}
          className="min-h-[88px] w-full rounded-md border border-line bg-surface-soft px-3.5 py-3 text-body text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        />
      </label>

      {error ? <p className="text-body-sm text-danger-ink">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting} disabled={submitting}>
          <Sprout strokeWidth={1.75} className="h-4 w-4" />
          {mode === "edit" ? tr("Lưu thay đổi", "Save changes") : tr("Tạo lô/vườn mới", "Create plot")}
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
