import type { ActionPlan, DiagnosisInputMethod, DiagnosisRecord, RecommendationBlock } from "@/types";

type DjangoDiagnosis = {
  id: number;
  title: string;
  image_url: string;
  image_data_url?: string;
  image_path: string;
  original_file_name: string;
  input_method: DiagnosisInputMethod;
  status: "pending" | "validated" | "completed" | "rejected" | string;
  is_leaf: boolean;
  yolo_confidence: number;
  yolo_payload: Record<string, unknown>;
  cnn_confidence: number;
  cnn_payload: Record<string, unknown>;
  plant_name: string;
  disease_name: string;
  severity: string;
  symptom_input: string;
  user_question: string;
  field_location: string;
  note: string;
  recommendations: unknown;
  action_plan: ActionPlan | Record<string, unknown>;
  rag_summary: string;
  rag_payload: Record<string, unknown>;
  saved_by_user: boolean;
  model_version: string;
  created_at: string;
  updated_at: string;
};

function authHeaders(accessToken?: string | null): Record<string, string> {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

async function diagnosesFetch<T>(path: string, accessToken?: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/django/${path.replace(/^\//, "").replace(/\/+$/, "")}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders(accessToken),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.detail || data.error || message;
    } catch {
      // keep HTTP status message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function normalizeRecommendations(value: unknown): RecommendationBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { title?: unknown; items?: unknown };
      if (typeof candidate.title !== "string" || !Array.isArray(candidate.items)) return null;
      return {
        title: candidate.title,
        items: candidate.items.filter((entry): entry is string => typeof entry === "string"),
      };
    })
    .filter((item): item is RecommendationBlock => Boolean(item));
}

function imageFromDiagnosis(item: DjangoDiagnosis) {
  return item.image_data_url || item.image_url || item.image_path || "/illustrations/non-leaf-sample.svg";
}

export function mapDiagnosisToRecord(item: DjangoDiagnosis): DiagnosisRecord {
  const recommendations = normalizeRecommendations(item.recommendations);
  const actionPlan = item.action_plan && Object.keys(item.action_plan).length ? (item.action_plan as ActionPlan) : undefined;
  const classificationReady = item.status === "completed" || Boolean(item.cnn_confidence);
  const confidence = classificationReady ? item.cnn_confidence || item.yolo_confidence : item.yolo_confidence;

  return {
    id: String(item.id),
    plant: item.plant_name || "Chưa xác định",
    disease: item.disease_name || (classificationReady ? "Đã phân loại" : "Ảnh lá đã xác thực"),
    confidence: Number(confidence || 0),
    severity: item.severity || (classificationReady ? "CNN" : "Đã kiểm tra"),
    classificationReady,
    image: imageFromDiagnosis(item),
    createdAt: item.created_at,
    note: item.note || "Bản ghi chẩn đoán đã được lưu trên hệ thống.",
    yoloVerified: item.is_leaf,
    leafConfidence: Number(item.yolo_confidence || 0),
    inputMethod: item.input_method,
    origin: "user",
    symptomSummary:
      item.symptom_input ||
      item.rag_summary ||
      (classificationReady
        ? "Kết quả phân loại đã được lưu cùng bản ghi chẩn đoán."
        : "Ảnh đã qua bước xác thực lá và đang chờ phân loại chi tiết."),
    causes: [
      item.cnn_payload?.class_name ? `Nhãn CNN: ${String(item.cnn_payload.class_name)}.` : "",
      item.model_version ? `Model: ${item.model_version}.` : "",
      item.yolo_confidence ? `Độ tin cậy xác thực lá: ${Math.round(item.yolo_confidence * 100)}%.` : "",
    ].filter(Boolean),
    recommendations,
    actionPlan,
    cnnConfidence: item.cnn_confidence || undefined,
    cnnPayload: item.cnn_payload,
    modelVersion: item.model_version,
    savedByUser: item.saved_by_user,
  };
}

export function diagnosisPayloadFromRecord(record: DiagnosisRecord) {
  const imageIsDataUrl = record.image.startsWith("data:");
  const imageIsRemoteUrl = /^https?:\/\//.test(record.image);

  return {
    title: `${record.plant} - ${record.disease}`.slice(0, 180),
    image_url: imageIsRemoteUrl ? record.image : "",
    image_data_url: imageIsDataUrl ? record.image : "",
    image_path: !imageIsDataUrl && !imageIsRemoteUrl ? record.image : "",
    input_method: record.inputMethod || "upload",
    status: record.classificationReady ? "completed" : record.yoloVerified ? "validated" : "pending",
    is_leaf: record.yoloVerified,
    yolo_confidence: record.leafConfidence ?? record.confidence,
    yolo_payload: {
      leaf_check_note: record.leafCheckNote || "",
      input_method: record.inputMethod || "upload",
    },
    cnn_confidence: record.cnnConfidence ?? (record.classificationReady ? record.confidence : 0),
    cnn_payload: record.cnnPayload || {},
    plant_name: record.plant,
    disease_name: record.disease,
    severity: record.severity,
    symptom_input: record.symptomSummary,
    note: record.note,
    recommendations: record.recommendations,
    action_plan: record.actionPlan || {},
    saved_by_user: true,
    model_version: record.modelVersion || "",
  };
}

export async function fetchDiagnosisRecords(accessToken: string | null | undefined) {
  if (!accessToken) return [];
  const items = await diagnosesFetch<DjangoDiagnosis[]>("/api/diagnoses", accessToken);
  return items.map(mapDiagnosisToRecord);
}

export async function fetchDiagnosisRecord(accessToken: string | null | undefined, id: string) {
  if (!accessToken) throw new Error("Bạn cần đăng nhập để xem bản ghi chẩn đoán.");
  const item = await diagnosesFetch<DjangoDiagnosis>(`/api/diagnoses/${id}`, accessToken);
  return mapDiagnosisToRecord(item);
}

export async function createDiagnosisRecord(accessToken: string | null | undefined, record: DiagnosisRecord) {
  if (!accessToken) return record;
  const item = await diagnosesFetch<DjangoDiagnosis>("/api/diagnoses", accessToken, {
    method: "POST",
    body: JSON.stringify(diagnosisPayloadFromRecord(record)),
  });
  return mapDiagnosisToRecord(item);
}

export async function updateDiagnosisRecord(
  accessToken: string | null | undefined,
  id: string,
  payload: Partial<ReturnType<typeof diagnosisPayloadFromRecord>>,
) {
  if (!accessToken) throw new Error("Bạn cần đăng nhập để cập nhật bản ghi chẩn đoán.");
  const item = await diagnosesFetch<DjangoDiagnosis>(`/api/diagnoses/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapDiagnosisToRecord(item);
}
