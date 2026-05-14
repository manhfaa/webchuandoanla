"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { Camera, CameraOff, CircleAlert, RefreshCcw, ScanSearch, SwitchCamera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraPreviewState } from "@/types";

function getCameraLabel(cameraState: CameraPreviewState) {
  if (cameraState === "live") return "Camera đang mở";
  if (cameraState === "starting") return "Đang khởi động";
  if (cameraState === "error") return "Cần mở lại camera";
  if (cameraState === "unsupported") return "Camera chưa hỗ trợ";
  return "Xem trước ảnh";
}

export function CameraFrame({
  previewUrl,
  busy,
  cameraState,
  cameraError,
  videoRef,
  onOpenCamera,
  onCapture,
  onCloseCamera,
  onSwitchCamera,
}: {
  previewUrl?: string | null;
  busy: boolean;
  cameraState: CameraPreviewState;
  cameraError?: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  onOpenCamera: () => void;
  onCapture: () => void;
  onCloseCamera: () => void;
  onSwitchCamera: () => void;
}) {
  const isLive = cameraState === "live";
  const isStarting = cameraState === "starting";
  const showVideo = isLive || isStarting;
  const hasBlockingMessage = cameraState === "error" || cameraState === "unsupported";

  return (
    <Card className="relative overflow-hidden rounded-[34px] border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Xem trước ảnh
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-ink">Khung xem trước</h3>
        </div>
        <div className="rounded-2xl bg-emerald-100 p-3 text-brand-700">
          <Camera size={20} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-emerald-100 bg-[#10231c] p-3">
        <div className="pointer-events-none absolute inset-5 rounded-[24px] border border-brand-300/70" />
        <div className="pointer-events-none absolute left-7 top-7 h-6 w-6 rounded-tl-2xl border-l-2 border-t-2 border-lime-200" />
        <div className="pointer-events-none absolute right-7 top-7 h-6 w-6 rounded-tr-2xl border-r-2 border-t-2 border-lime-200" />
        <div className="pointer-events-none absolute bottom-7 left-7 h-6 w-6 rounded-bl-2xl border-b-2 border-l-2 border-lime-200" />
        <div className="pointer-events-none absolute bottom-7 right-7 h-6 w-6 rounded-br-2xl border-b-2 border-r-2 border-lime-200" />

        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-[320px] w-full rounded-[24px] object-cover"
          />
        ) : previewUrl ? (
          <Image
            src={previewUrl}
            alt="Ảnh lá cây đã chọn"
            width={1200}
            height={760}
            unoptimized
            className="h-[320px] w-full rounded-[24px] object-cover"
          />
        ) : (
          <div className="relative h-[320px] overflow-hidden rounded-[24px]">
            <Image
              src="/illustrations/scan-panel.svg"
              alt="Khung xem trước ảnh lá cây"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08140f]/80 via-transparent to-transparent" />
            <div className="absolute inset-x-6 bottom-6 rounded-[24px] border border-white/12 bg-[#07120f]/72 p-5 text-white backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
                Camera
              </p>
              <h4 className="mt-2 font-display text-2xl font-semibold">
                Mở camera để chụp nhanh ảnh lá
              </h4>
              <p className="mt-3 text-sm leading-7 text-white/78">
                Bạn có thể chụp trực tiếp trên giao diện hoặc dùng ảnh đã có sẵn trong thiết bị.
              </p>
              <div className="mt-4">
                <Button variant="secondary" onClick={onOpenCamera} disabled={busy}>
                  <Camera size={18} />
                  Mở camera
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
          <ScanSearch size={14} className="text-lime-200" />
          {getCameraLabel(cameraState)}
        </div>

        {isStarting ? (
          <div className="absolute inset-x-6 bottom-6 rounded-[24px] border border-white/10 bg-[#07120f]/78 p-4 text-white backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-lime-200 border-t-transparent" />
              <p className="text-sm font-medium">Đang mở camera...</p>
            </div>
          </div>
        ) : null}

        {isLive ? (
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[#07120f]/78 p-4 text-white backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
                Camera sẵn sàng
              </p>
              <p className="mt-1 text-sm text-white/78">
                Canh chiếc lá vào giữa khung rồi bấm chụp ảnh.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onCapture} disabled={busy}>
                <Camera size={18} />
                Chụp ảnh
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onSwitchCamera} disabled={busy}>
                <SwitchCamera size={18} />
                Đổi camera
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onCloseCamera} disabled={busy}>
                <CameraOff size={18} />
                Tắt camera
              </Button>
            </div>
          </div>
        ) : null}

        {hasBlockingMessage ? (
          <div className="absolute inset-x-6 bottom-6 rounded-[24px] border border-amber-200/40 bg-[#07120f]/80 p-5 text-white backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100/90 p-2 text-amber-800">
                <CircleAlert size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Trạng thái camera
                </p>
                <p className="mt-2 text-sm leading-7 text-white/82">
                  {cameraError ?? "Camera hiện chưa sẵn sàng. Bạn có thể mở lại camera hoặc chuyển sang tải ảnh từ thiết bị."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {cameraState !== "unsupported" ? (
                    <Button variant="secondary" onClick={onOpenCamera} disabled={busy}>
                      <RefreshCcw size={18} />
                      Mở lại camera
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!showVideo && previewUrl && !hasBlockingMessage ? (
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[#07120f]/78 p-4 text-white backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
                Ảnh đã sẵn sàng
              </p>
              <p className="mt-1 text-sm text-white/78">
                Bạn có thể kiểm tra ảnh này ngay hoặc chụp lại một ảnh mới rõ hơn.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onOpenCamera} disabled={busy}>
                <RefreshCcw size={18} />
                Chụp lại
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
