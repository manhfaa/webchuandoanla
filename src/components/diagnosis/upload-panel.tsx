"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useRef, useState } from "react";
import { Camera, Check, ImagePlus, PlayCircle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiagnosisStatus as DiagnosisStatusBadge } from "@/components/ui/diagnosis-status";
import { MobileBottomAction } from "@/components/ui/mobile-bottom-action";
import { PlateNumber } from "@/components/ui/field-notebook";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import type { DiagnosisInputMethod, DiagnosisStatus } from "@/types";

/* V2 — PANEL TẢI ẢNH
   Sửa: icon chip 56x56 trong khung kéo-thả -> khung dùng gân lá mảnh + chữ,
        bỏ chip 40x40 ở overline (dùng số hiệu mono 01),
        3 tip đổi từ ô bo góc nền botanical -> hàng hairline có dấu check nhỏ,
        khung kéo-thả tăng lên 260px và bỏ `bg-canvas` (dùng surface-soft khi
        hover để tương phản rõ ở cả 2 theme).
   Giữ: toàn bộ callback, input ẩn, camera fallback, MobileBottomAction, copy. */

const tips: [string, string][] = [
  [
    "Chụp một chiếc lá rõ, đủ sáng và không bị che khuất.",
    "Take a clear, well-lit photo of a single leaf with nothing blocking it.",
  ],
  [
    "Để lá chiếm phần lớn khung hình, tránh nền quá nhiều chi tiết.",
    "Let the leaf fill most of the frame and avoid a busy background.",
  ],
  [
    "Nếu có đốm ở mặt dưới, hãy chụp thêm một ảnh để tiện theo dõi.",
    "If there are spots on the underside, take one more photo to keep track.",
  ],
];

export function UploadPanel({
  status,
  busy,
  cameraSupported,
  onFileSelected,
  onOpenCamera,
  onStart,
}: {
  status: DiagnosisStatus;
  busy: boolean;
  cameraSupported: boolean;
  onFileSelected: (file: File, method: DiagnosisInputMethod) => void;
  onOpenCamera: () => void;
  onStart: () => void;
}) {
  const tr = useTr();
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const captureRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>, method: DiagnosisInputMethod) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file, method);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file, "upload");
  }

  function openCapture() {
    if (cameraSupported) onOpenCamera();
    else captureRef.current?.click();
  }

  return (
    <Card variant="raised" padding="lg" className="rounded-[var(--r-2xl)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">
            <PlateNumber n={1} tone="leaf" size="sm" />
            {tr("Tải ảnh", "Upload photo")}
          </p>
          <h2 className="mt-3 max-w-2xl text-balance font-display text-[24px] font-bold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[28px]">
            {tr("Chọn một ảnh lá rõ để bắt đầu", "Pick a clear leaf photo to get started")}
          </h2>
          <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.7] text-ink-soft">
            {tr(
              "Bạn có thể kéo ảnh vào khung, chọn từ thiết bị hoặc chụp trực tiếp bằng camera.",
              "You can drag a photo into the frame, choose one from your device, or capture directly with the camera.",
            )}
          </p>
        </div>
        <DiagnosisStatusBadge status={status} />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => uploadRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        data-scanning={busy || undefined}
        className={cn(
          "fl-lens-frame group mt-6 flex min-h-[260px] w-full flex-col items-center justify-center rounded-[var(--r-lg)] border-2 border-dashed px-6 py-10 text-center transition duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/35 disabled:cursor-not-allowed disabled:opacity-70",
          dragActive
            ? "border-leaf bg-surface-soft"
            : "border-line bg-surface hover:border-leaf/45 hover:bg-surface-soft",
        )}
      >
        {/* Gân lá mảnh thay cho icon chip 56x56 */}
        <svg
          viewBox="0 0 48 48"
          aria-hidden
          className="h-11 w-11 text-leaf transition duration-260 group-hover:-translate-y-1"
        >
          <path
            d="M24 8C13 13 7 24 9 34c5 4 12 4 15 4s10 0 15-4c2-10-4-21-15-26Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M24 14v24M24 20l-7 5M24 20l7 5M24 28l-6 4M24 28l6 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
        <span className="mt-5 text-[15.5px] font-bold text-ink">
          {tr("Kéo ảnh lá vào đây hoặc bấm để chọn", "Drag a leaf photo here or click to choose")}
        </span>
        <span className="mt-2 max-w-[52ch] text-[13.5px] leading-[1.6] text-ink-soft">
          {tr(
            "Hỗ trợ ảnh JPG, PNG và ảnh chụp từ điện thoại. Ưu tiên ảnh chỉ có một chiếc lá chính.",
            "Supports JPG, PNG and phone photos. A single main leaf works best.",
          )}
        </span>
        <span className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-leaf-strong">
          <Upload size={16} aria-hidden /> {tr("Chọn ảnh từ thiết bị", "Choose a photo from your device")}
        </span>
      </button>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={openCapture}
          disabled={busy}
          className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] border border-line bg-surface px-5 text-[14px] font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-70"
        >
          <Camera size={18} className="text-leaf-strong" aria-hidden />{" "}
          {cameraSupported
            ? tr("Mở camera để chụp", "Open camera to capture")
            : tr("Chụp ảnh từ thiết bị", "Take a photo with your device")}
        </button>
        <Button
          type="button"
          size="lg"
          loading={busy}
          disabled={busy}
          onClick={onStart}
          className="w-full sm:w-auto"
        >
          <PlayCircle size={18} aria-hidden /> {tr("Bắt đầu kiểm tra", "Start check")}
        </Button>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-soil">
          {tr("Để ảnh dễ kiểm tra hơn", "For an easier-to-check photo")}
        </p>
        <div className="mt-2">
          {tips.map((tip) => (
            <div
              key={tip[0]}
              className="flex items-start gap-2.5 border-t border-paper-rule py-2.5 first:border-t-0"
            >
              <Check size={14} strokeWidth={2.6} className="mt-[3px] shrink-0 text-leaf" aria-hidden />
              <p className="text-[13px] font-medium leading-[1.6] text-ink">{tr(tip[0], tip[1])}</p>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomAction>
        <Button
          type="button"
          size="lg"
          loading={busy}
          disabled={busy}
          onClick={onStart}
          className="w-full"
        >
          <PlayCircle size={18} aria-hidden /> {tr("Bắt đầu kiểm tra", "Start check")}
        </Button>
      </MobileBottomAction>

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileChange(event, "upload")}
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFileChange(event, "capture")}
      />
    </Card>
  );
}
