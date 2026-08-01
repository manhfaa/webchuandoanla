const OFFLINE_QUEUE_KEY = "agromind-offline-diagnosis-queue";

/** Hard cap on queued images: each entry carries a base64 photo, so the queue must stay small. */
const OFFLINE_QUEUE_LIMIT = 10;

export type OfflineDiagnosisItem = {
  id: string;
  imageDataUrl: string;
  createdAt: string;
  note: string;
  status: "pending" | "sent";
  /**
   * The crop declared when this photo was taken, not when it is finally sent.
   * A queued photo may sit here for days while the user moves on to a different
   * plot, so replaying it against whatever crop is selected at reconnect time
   * would filter the wrong plant's diseases. Optional: entries queued before
   * this field existed replay unfiltered, which is the correct reading of "no
   * crop was declared".
   */
  cropId?: string | null;
};

export function getOfflineQueue(): OfflineDiagnosisItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? (parsed as OfflineDiagnosisItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Writes the queue newest-first, capped to OFFLINE_QUEUE_LIMIT.
 * If storage rejects the write (quota exceeded, private mode) the oldest entries are dropped
 * and the write is retried, so a full disk can never throw into the diagnosis flow.
 */
function writeOfflineQueue(items: OfflineDiagnosisItem[]) {
  if (typeof window === "undefined") return;
  let queue = items.slice(0, OFFLINE_QUEUE_LIMIT);

  while (queue.length > 0) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return;
    } catch {
      queue = queue.slice(0, queue.length - 1);
    }
  }

  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // storage is unavailable; nothing can be queued on this device
  }
}

export function addOfflineDiagnosis(
  imageDataUrl: string,
  note = "Chờ gửi lại khi có mạng",
  cropId: string | null = null,
) {
  if (typeof window === "undefined") return;
  writeOfflineQueue([
    {
      id: `offline-${Date.now()}`,
      imageDataUrl,
      createdAt: new Date().toISOString(),
      note,
      status: "pending" as const,
      cropId,
    },
    ...getOfflineQueue(),
  ]);
  window.dispatchEvent(new Event("agromind-offline-queue"));
}

export function clearOfflineDiagnosis(id: string) {
  if (typeof window === "undefined") return;
  writeOfflineQueue(getOfflineQueue().filter((item) => item.id !== id));
  window.dispatchEvent(new Event("agromind-offline-queue"));
}
