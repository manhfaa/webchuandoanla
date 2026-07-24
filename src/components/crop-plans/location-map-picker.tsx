"use client";

import dynamic from "next/dynamic";
import { MapPin, Search, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";

const DynamicMap = dynamic(
  () => import("./location-map-canvas").then((module) => module.LocationMapCanvas),
  { ssr: false },
);

const quickLocations = [
  { label: "Thủ Đức, TP.HCM", lat: 10.8421, lon: 106.8286 },
  { label: "Đà Lạt, Lâm Đồng", lat: 11.9404, lon: 108.4583 },
  { label: "Cần Thơ", lat: 10.0452, lon: 105.7469 },
  { label: "Đà Nẵng", lat: 16.0544, lon: 108.2022 },
];

export function LocationMapPicker({
  name,
  address,
  lat,
  lon,
  onNameChange,
  onAddressChange,
  onPositionChange,
}: {
  name: string;
  address: string;
  lat: number;
  lon: number;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPositionChange: (lat: number, lon: number) => void;
}) {
  const tr = useTr();
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card variant="raised" className="overflow-hidden rounded-xl p-0">
        <div className="border-b border-line bg-surface-soft px-5 py-4">
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <span className="rounded-md bg-surface p-2 text-leaf-strong">
              <MapPin size={16} />
            </span>
            {tr("Chạm hoặc kéo ghim để chọn đúng nơi bạn sẽ trồng cây.", "Tap or drag the pin to select exactly where you will plant.")}
          </div>
        </div>
        <div className="h-[360px] p-3">
          <DynamicMap lat={lat} lon={lon} onChange={onPositionChange} />
        </div>
      </Card>

      <div className="space-y-5">
        <Card variant="default" padding="lg" className="rounded-xl">
          <p className="text-overline text-leaf-strong">
            {tr("Vị trí trồng", "Planting location")}
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">{tr("Tên khu trồng", "Growing area name")}</span>
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                placeholder={tr("Ví dụ: Vườn sau nhà", "e.g. Backyard garden")}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">{tr("Mô tả địa chỉ", "Address description")}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" size={16} />
                <input
                  value={address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  className="w-full rounded-md border border-line bg-surface py-3 pl-11 pr-4 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  placeholder={tr("Ví dụ: Phường Linh Trung, Thủ Đức", "e.g. Linh Trung Ward, Thu Duc")}
                />
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-surface-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">{tr("Vĩ độ", "Latitude")}</p>
                <p className="mt-1 font-semibold text-ink">{lat.toFixed(4)}</p>
              </div>
              <div className="rounded-md border border-line bg-surface-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">{tr("Kinh độ", "Longitude")}</p>
                <p className="mt-1 font-semibold text-ink">{lon.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="soft" padding="lg" className="rounded-xl">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-surface p-2 text-leaf-strong">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-bold text-ink">{tr("Chọn nhanh khu vực gợi ý", "Quickly pick a suggested area")}</p>
              <p className="text-sm text-ink-soft">{tr("Bạn có thể chọn nhanh rồi kéo lại ghim nếu cần.", "You can pick one quickly, then drag the pin again if needed.")}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {quickLocations.map((location) => (
              <Button
                key={location.label}
                variant="secondary"
                className="justify-between border-line bg-surface px-4"
                onClick={() => {
                  onNameChange(location.label);
                  onAddressChange(location.label);
                  onPositionChange(location.lat, location.lon);
                }}
              >
                <span>{location.label}</span>
                <span className="text-xs text-ink-soft">
                  {location.lat.toFixed(2)}, {location.lon.toFixed(2)}
                </span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
