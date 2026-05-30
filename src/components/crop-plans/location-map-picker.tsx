"use client";

import dynamic from "next/dynamic";
import { MapPin, Search, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden rounded-[30px] border-emerald-100/70 bg-white/90 p-0">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-white to-emerald-50/80 px-5 py-4">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <MapPin size={16} />
            </span>
            Chạm hoặc kéo ghim để chọn đúng nơi bạn sẽ trồng cây.
          </div>
        </div>
        <div className="h-[360px] p-3">
          <DynamicMap lat={lat} lon={lon} onChange={onPositionChange} />
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="rounded-[30px] border-emerald-100/70 bg-white/90">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/70">
            Vị trí trồng
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tên khu trồng</span>
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
                placeholder="Ví dụ: Vườn sau nhà"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Mô tả địa chỉ</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  className="w-full rounded-2xl border border-emerald-100 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
                  placeholder="Ví dụ: Phường Linh Trung, Thủ Đức"
                />
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/65">Lat</p>
                <p className="mt-1 font-semibold text-slate-900">{lat.toFixed(4)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/65">Lon</p>
                <p className="mt-1 font-semibold text-slate-900">{lon.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[30px] border-emerald-100/70 bg-gradient-to-br from-white via-[#f5fceb] to-emerald-50">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-lime-100 p-2 text-emerald-800">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-medium text-slate-900">Chọn nhanh khu vực gợi ý</p>
              <p className="text-sm text-slate-600">Bạn có thể chọn nhanh rồi kéo lại ghim nếu cần.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {quickLocations.map((location) => (
              <Button
                key={location.label}
                variant="secondary"
                className="justify-between rounded-2xl border border-emerald-100 bg-white/90 px-4"
                onClick={() => {
                  onNameChange(location.label);
                  onAddressChange(location.label);
                  onPositionChange(location.lat, location.lon);
                }}
              >
                <span>{location.label}</span>
                <span className="text-xs text-slate-500">
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
