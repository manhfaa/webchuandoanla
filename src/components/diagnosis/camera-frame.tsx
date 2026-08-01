"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { Camera, CameraOff, CircleAlert, RefreshCcw, ScanSearch, SwitchCamera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTr } from "@/lib/use-tr";
import { CameraPreviewState } from "@/types";

type Tr = (vi: string, en: string) => string;

function getCameraLabel(cameraState: CameraPreviewState, tr: Tr) {
  if (cameraState === "live") return tr("Camera đang mở", "Camera is on");
  if (cameraState === "starting") return tr("Đang khởi động", "Starting up");
  if (cameraState === "error") return tr("Cần mở lại camera", "Reopen the camera");
  if (cameraState === "unsupported") return tr("Camera chưa hỗ trợ", "Camera not supported");
  return tr("Xem trước ảnh", "Photo preview");
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
  const tr = useTr();
  const isLive = cameraState === "live";
  const isStarting = cameraState === "starting";
  const showVideo = isLive || isStarting;
  const hasBlockingMessage = cameraState === "error" || cameraState === "unsupported";

  return (
    <Card variant="raised" className="relative overflow-hidden rounded-xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            {tr("Xem trước ảnh", "Photo preview")}
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-ink">{tr("Khung xem trước", "Preview frame")}</h3>
        </div>
        <div className="rounded-md bg-surface-soft p-3 text-leaf-strong">
          <Camera size={20} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-line bg-forest p-3">
        <div className="pointer-events-none absolute inset-5 rounded-lg border border-mint/55" />
        <div className="pointer-events-none absolute left-7 top-7 h-6 w-6 rounded-tl-md border-l-2 border-t-2 border-mint" />
        <div className="pointer-events-none absolute right-7 top-7 h-6 w-6 rounded-tr-md border-r-2 border-t-2 border-mint" />
        <div className="pointer-events-none absolute bottom-7 left-7 h-6 w-6 rounded-bl-md border-b-2 border-l-2 border-mint" />
        <div className="pointer-events-none absolute bottom-7 right-7 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-mint" />

        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-[320px] w-full rounded-lg object-cover"
          />
        ) : previewUrl ? (
          <Image
            src={previewUrl}
            alt={tr("Ảnh lá cây đã chọn", "Selected leaf photo")}
            width={1200}
            height={760}
            unoptimized
            className="h-[320px] w-full rounded-lg object-cover"
          />
        ) : (
          <div className="relative h-[320px] overflow-hidden rounded-lg">
            <Image
              src="/illustrations/scan-panel.svg"
              alt={tr("Khung xem trước ảnh lá cây", "Leaf photo preview frame")}
              fill
              priority
              loading="eager"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-transparent to-transparent" />
            <div className="absolute inset-x-6 bottom-6 rounded-lg border border-on-forest/15 bg-forest/80 p-5 text-on-forest backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">
                Camera
              </p>
              <h4 className="mt-2 font-display text-2xl font-semibold">
                {tr("Mở camera để chụp nhanh ảnh lá", "Open the camera to quickly capture a leaf photo")}
              </h4>
              <p className="mt-3 text-sm leading-7 text-on-forest-muted">
                {tr("Bạn có thể chụp trực tiếp trên giao diện hoặc dùng ảnh đã có sẵn trong thiết bị.", "You can capture right here or use a photo already on your device.")}
              </p>
              <div className="mt-4">
                <Button variant="secondary" onClick={onOpenCamera} disabled={busy}>
                  <Camera size={18} />
                  {tr("Mở camera", "Open camera")}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full bg-on-forest/10 px-3 py-2 text-xs font-semibold text-on-forest backdrop-blur">
          <ScanSearch size={14} className="text-mint" />
          {getCameraLabel(cameraState, tr)}
        </div>

        {isStarting ? (
          <div className="absolute inset-x-6 bottom-6 rounded-lg border border-on-forest/15 bg-forest/85 p-4 text-on-forest backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-mint border-t-transparent" />
              <p className="text-sm font-medium">{tr("Đang mở camera...", "Opening camera...")}</p>
            </div>
          </div>
        ) : null}

        {isLive ? (
          // Three labelled buttons plus a two-line hint wrapped to three rows at
          // 390px, making this bar ~259px tall over a 320px preview: it covered
          // the frame the grower is being told to centre the leaf in, and buried
          // the corner guides. Below sm the hint is dropped and the buttons go
          // icon-only, which fits one row and leaves the preview visible.
          // bg-forest/85 and border-on-forest/15 compiled to nothing — bare
          // `var(--token)` colours take no opacity modifier — so the text was
          // sitting directly on moving video with no panel behind it at all.
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--on-forest)_15%,transparent)] bg-[color-mix(in_srgb,var(--forest)_85%,transparent)] p-3 text-on-forest backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-4">
            <div className="hidden min-w-0 sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">
                {tr("Camera sẵn sàng", "Camera ready")}
              </p>
              <p className="mt-1 text-sm text-on-forest-muted">
                {tr("Canh chiếc lá vào giữa khung rồi bấm chụp ảnh.", "Center the leaf in the frame, then press capture.")}
              </p>
            </div>

            <div className="flex w-full items-center justify-center gap-3 sm:w-auto sm:justify-end">
              <Button variant="secondary" onClick={onCapture} disabled={busy} aria-label={tr("Chụp ảnh", "Capture")}>
                <Camera size={18} aria-hidden />
                <span className="hidden sm:inline">{tr("Chụp ảnh", "Capture")}</span>
              </Button>
              <Button
                variant="ghost"
                className="text-on-forest hover:bg-[color-mix(in_srgb,var(--on-forest)_10%,transparent)]"
                onClick={onSwitchCamera}
                disabled={busy}
                aria-label={tr("Đổi camera", "Switch camera")}
              >
                <SwitchCamera size={18} aria-hidden />
                <span className="hidden sm:inline">{tr("Đổi camera", "Switch camera")}</span>
              </Button>
              <Button
                variant="ghost"
                className="text-on-forest hover:bg-[color-mix(in_srgb,var(--on-forest)_10%,transparent)]"
                onClick={onCloseCamera}
                disabled={busy}
                aria-label={tr("Tắt camera", "Turn off camera")}
              >
                <CameraOff size={18} aria-hidden />
                <span className="hidden sm:inline">{tr("Tắt camera", "Turn off camera")}</span>
              </Button>
            </div>
          </div>
        ) : null}

        {hasBlockingMessage ? (
          <div className="absolute inset-x-6 bottom-6 rounded-lg border border-sun/40 bg-forest/90 p-5 text-on-forest backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-sun-soft p-2 text-sun">
                <CircleAlert size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sun">
                  {tr("Trạng thái camera", "Camera status")}
                </p>
                <p className="mt-2 text-sm leading-7 text-on-forest-muted">
                  {cameraError ?? tr("Camera hiện chưa sẵn sàng. Bạn có thể mở lại camera hoặc chuyển sang tải ảnh từ thiết bị.", "The camera isn't ready right now. You can reopen it or switch to uploading a photo from your device.")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {cameraState !== "unsupported" ? (
                    <Button variant="secondary" onClick={onOpenCamera} disabled={busy}>
                      <RefreshCcw size={18} />
                      {tr("Mở lại camera", "Reopen camera")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!showVideo && previewUrl && !hasBlockingMessage ? (
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-on-forest/15 bg-forest/85 p-4 text-on-forest backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">
                {tr("Ảnh đã sẵn sàng", "Photo ready")}
              </p>
              <p className="mt-1 text-sm text-on-forest-muted">
                {tr("Bạn có thể kiểm tra ảnh này ngay hoặc chụp lại một ảnh mới rõ hơn.", "You can check this photo now or retake a clearer one.")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onOpenCamera} disabled={busy}>
                <RefreshCcw size={18} />
                {tr("Chụp lại", "Retake")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
