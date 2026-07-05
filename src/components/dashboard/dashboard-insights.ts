import type { DiagnosisRecord } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ResultStatusTone = "success" | "warning" | "risk";

export function getRecordConfidence(record: DiagnosisRecord) {
  return record.cnnConfidence ?? record.leafConfidence ?? record.confidence ?? 0;
}

function getRecordTime(record: DiagnosisRecord) {
  const time = new Date(record.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isSameDay(record: DiagnosisRecord, date = new Date()) {
  const value = new Date(record.createdAt);
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

function isWithinDays(record: DiagnosisRecord, days: number, date = new Date()) {
  const time = getRecordTime(record);
  if (!time) return false;
  return date.getTime() - time <= days * DAY_MS;
}

export function getResultStatus(record: DiagnosisRecord): {
  label: string;
  tone: ResultStatusTone;
} {
  const confidence = getRecordConfidence(record);

  if (!record.yoloVerified || confidence < 0.55) {
    return { label: "Nên kiểm tra lại", tone: "risk" };
  }

  if (confidence < 0.7) {
    return { label: "Cần theo dõi", tone: "warning" };
  }

  return { label: "Tin cậy cao", tone: "success" };
}

export function getDashboardInsights(records: DiagnosisRecord[]) {
  const sortedRecords = [...records].sort((a, b) => getRecordTime(b) - getRecordTime(a));
  const total = sortedRecords.length;
  const todayChecks = sortedRecords.filter((record) => isSameDay(record)).length;
  const last7Days = sortedRecords.filter((record) => isWithinDays(record, 7));
  const validLeafCount = sortedRecords.filter((record) => record.yoloVerified).length;
  const classifiedCount = sortedRecords.filter((record) => record.classificationReady).length;
  const confidentCount = sortedRecords.filter((record) => getRecordConfidence(record) >= 0.7).length;
  const savedCount = sortedRecords.filter((record) => record.savedByUser).length;
  const averageConfidence = total
    ? sortedRecords.reduce((sum, record) => sum + getRecordConfidence(record), 0) / total
    : 0;
  const attentionRecords = sortedRecords.filter((record) => getResultStatus(record).tone !== "success");
  const attentionLast7Days = last7Days.filter((record) => getResultStatus(record).tone !== "success").length;

  return {
    sortedRecords,
    total,
    todayChecks,
    last7DaysCount: last7Days.length,
    validLeafCount,
    classifiedCount,
    confidentCount,
    savedCount,
    averageConfidence,
    attentionCount: attentionRecords.length,
    attentionLast7Days,
  };
}
