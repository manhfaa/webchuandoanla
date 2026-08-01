"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";

import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";
import type { DiagnosisInputMethod } from "@/types";

/**
 * Picks the leaf image: a dropzone plus a camera button, nothing else.
 *
 * This used to be a full card carrying its own step heading, its own "Bắt đầu
 * kiểm tra" button, a tips grid and a pinned mobile action bar. The diagnosis
 * page now runs as a step wizard where the shell owns the heading, the primary
 * action and the progress, so all of that was either duplicated chrome or, in
 * the case of the pinned bar, an action that fired at the wrong time.
 */
export function UploadPanel({
  busy,
  cameraSupported,
  onFileSelected,
  onOpenCamera,
}: {
  busy: boolean;
  cameraSupported: boolean;
  onFileSelected: (file: File, method: DiagnosisInputMethod) => void;
  onOpenCamera: () => void;
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
    <div className="flex flex-col gap-3">
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
          "fl-lens-frame group flex min-h-[180px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 text-center transition duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--leaf)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-70",
          dragActive
            ? "border-leaf bg-surface-soft shadow-glow"
            : "border-line bg-canvas hover:border-[color-mix(in_srgb,var(--leaf)_45%,transparent)] hover:bg-surface-soft",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-leaf-strong shadow-sm transition group-hover:-translate-y-1 motion-reduce:transition-none">
          <ImagePlus size={22} aria-hidden />
        </span>
        <span className="mt-4 text-base font-bold text-ink">
          {tr("Kéo ảnh vào đây hoặc bấm để chọn", "Drag a photo here or tap to choose")}
        </span>
        <span className="mt-1.5 max-w-md text-sm leading-6 text-ink-soft">
          {tr("JPG, PNG hoặc ảnh chụp từ điện thoại.", "JPG, PNG, or a photo from your phone.")}
        </span>
      </button>

      <button
        type="button"
        onClick={openCapture}
        disabled={busy}
        className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-70"
      >
        <Camera size={18} className="text-leaf-strong" aria-hidden />{" "}
        {cameraSupported ? tr("Mở camera để chụp", "Open camera") : tr("Chụp ảnh từ thiết bị", "Take a photo")}
      </button>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFileChange(event, "upload")} />
      <input ref={captureRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleFileChange(event, "capture")} />
    </div>
  );
}
