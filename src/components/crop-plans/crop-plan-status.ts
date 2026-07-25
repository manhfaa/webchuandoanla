import type { ClimateConfidence } from "@/lib/crop-plans-client";
import type { CropPlanStatus, CropPlanStepStatus } from "@/types";

/**
 * Labels for the raw enum values the API returns. They live here rather than in
 * `@/lib/crop-plan-labels` so the crop-plan screens can share one source of
 * truth for plan status, step status and climate confidence.
 */

const planStatusLabels: Record<CropPlanStatus, [string, string]> = {
  draft: ["Bản nháp", "Draft"],
  active: ["Đang theo dõi", "Active"],
  paused: ["Tạm dừng", "Paused"],
  completed: ["Đã hoàn thành", "Completed"],
  needs_review: ["Cần xem lại", "Needs review"],
  archived: ["Đã lưu trữ", "Archived"],
};

const planStatusTones: Record<CropPlanStatus, string> = {
  draft: "bg-surface-soft text-leaf-strong",
  active: "bg-surface-soft text-leaf-strong",
  paused: "bg-surface-soft text-ink-soft",
  completed: "bg-info-soft text-info-ink",
  needs_review: "bg-sun-soft text-warning-ink",
  archived: "bg-surface-soft text-ink-soft",
};

const stepStatusLabels: Record<CropPlanStepStatus, [string, string]> = {
  pending: ["Sắp tới", "Upcoming"],
  current: ["Đang thực hiện", "In progress"],
  completed: ["Đã hoàn thành", "Completed"],
  skipped: ["Bỏ qua", "Skipped"],
  delayed: ["Bị đổi lịch", "Rescheduled"],
};

const climateConfidenceLabels: Record<Exclude<ClimateConfidence, "">, [string, string]> = {
  observed: ["Số liệu thực đo", "Measured data"],
  climatology: ["Trung bình khí hậu nhiều năm", "Multi-year climate average"],
  unavailable: ["Chưa có dữ liệu khí hậu", "No climate data"],
};

const climateConfidenceNotes: Record<Exclude<ClimateConfidence, "">, [string, string]> = {
  observed: [
    "Đánh giá dựa trên số liệu khí hậu đã đo được cho đúng khoảng thời gian này.",
    "The assessment uses climate data actually measured over this window.",
  ],
  climatology: [
    "Khoảng thời gian này chưa xảy ra nên hệ thống dùng trung bình nhiều năm của cùng thời điểm trong năm, không phải dự báo.",
    "This window has not happened yet, so the system uses the multi-year average for the same time of year, not a forecast.",
  ],
  unavailable: [
    "Chưa lấy được số liệu khí hậu nên chưa chấm được mức phù hợp.",
    "Climate data could not be retrieved, so no suitability score was calculated.",
  ],
};

/** Returns [vi, en] so it can be spread straight into `tr(...)`. */
export function cropPlanStatusLabel(status: string): [string, string] {
  return planStatusLabels[status as CropPlanStatus] ?? [status, status];
}

export function cropPlanStatusTone(status: string): string {
  return planStatusTones[status as CropPlanStatus] ?? planStatusTones.active;
}

/** Returns [vi, en] so it can be spread straight into `tr(...)`. */
export function cropPlanStepStatusLabel(status: string): [string, string] {
  return stepStatusLabels[status as CropPlanStepStatus] ?? [status, status];
}

/** Returns [vi, en], or null when the plan predates confidence tracking. */
export function climateConfidenceLabel(confidence: ClimateConfidence): [string, string] | null {
  if (!confidence) return null;
  return climateConfidenceLabels[confidence] ?? null;
}

/** Returns [vi, en], or null when the plan predates confidence tracking. */
export function climateConfidenceNote(confidence: ClimateConfidence): [string, string] | null {
  if (!confidence) return null;
  return climateConfidenceNotes[confidence] ?? null;
}
