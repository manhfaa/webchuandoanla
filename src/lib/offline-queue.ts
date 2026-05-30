const OFFLINE_QUEUE_KEY = "agromind-offline-diagnosis-queue";

export type OfflineDiagnosisItem = {
  id: string;
  imageDataUrl: string;
  createdAt: string;
  note: string;
  status: "pending" | "sent";
};

export function getOfflineQueue(): OfflineDiagnosisItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]") as OfflineDiagnosisItem[];
  } catch {
    return [];
  }
}

export function addOfflineDiagnosis(imageDataUrl: string, note = "Chờ gửi lại khi có mạng") {
  if (typeof window === "undefined") return;
  const next = [
    {
      id: `offline-${Date.now()}`,
      imageDataUrl,
      createdAt: new Date().toISOString(),
      note,
      status: "pending" as const,
    },
    ...getOfflineQueue(),
  ].slice(0, 10);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("agromind-offline-queue"));
}

export function clearOfflineDiagnosis(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    OFFLINE_QUEUE_KEY,
    JSON.stringify(getOfflineQueue().filter((item) => item.id !== id)),
  );
  window.dispatchEvent(new Event("agromind-offline-queue"));
}
