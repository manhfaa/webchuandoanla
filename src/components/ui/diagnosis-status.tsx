"use client";

import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import { useTr } from "@/lib/use-tr";
import type { DiagnosisStatus as DiagnosisStatusValue } from "@/types";

const statusMeta: Record<DiagnosisStatusValue, { label: string; labelEn: string; state: StatusBadgeState }> = {
  idle: { label: "Sẵn sàng nhận ảnh", labelEn: "Ready for an image", state: "neutral" },
  uploading: { label: "Đang chuẩn bị ảnh", labelEn: "Preparing image", state: "processing" },
  scanning: { label: "Đang phân tích", labelEn: "Analyzing", state: "processing" },
  "symptom-review": { label: "Chờ thêm triệu chứng", labelEn: "Awaiting more symptoms", state: "watch" },
  success: { label: "Đã có kết quả", labelEn: "Result ready", state: "healthy" },
  "invalid-image": { label: "Cần chụp lại", labelEn: "Retake needed", state: "urgent" },
  locked: { label: "Chưa thể tiếp tục", labelEn: "Cannot continue yet", state: "neutral" },
};

export function DiagnosisStatus({ status }: { status: DiagnosisStatusValue }) {
  const tr = useTr();
  const meta = statusMeta[status];
  return <StatusBadge status={meta.state} label={tr(meta.label, meta.labelEn)} />;
}
