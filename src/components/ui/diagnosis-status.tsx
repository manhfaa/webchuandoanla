import { StatusBadge, type StatusBadgeState } from "@/components/ui/badge";
import type { DiagnosisStatus as DiagnosisStatusValue } from "@/types";

const statusMeta: Record<DiagnosisStatusValue, { label: string; state: StatusBadgeState }> = {
  idle: { label: "Sẵn sàng nhận ảnh", state: "neutral" },
  uploading: { label: "Đang chuẩn bị ảnh", state: "processing" },
  scanning: { label: "Đang phân tích", state: "processing" },
  "symptom-review": { label: "Chờ thêm triệu chứng", state: "watch" },
  success: { label: "Đã có kết quả", state: "healthy" },
  "invalid-image": { label: "Cần chụp lại", state: "urgent" },
  locked: { label: "Chưa thể tiếp tục", state: "neutral" },
};

export function DiagnosisStatus({ status }: { status: DiagnosisStatusValue }) {
  const meta = statusMeta[status];
  return <StatusBadge status={meta.state} label={meta.label} />;
}
