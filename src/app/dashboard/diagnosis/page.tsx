"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, MessageSquareText, Sparkles } from "lucide-react";

import { AIProcessStepper } from "@/components/diagnosis/ai-process-stepper";
import type { StepItem } from "@/components/diagnosis/ai-process-stepper";
import { CameraFrame } from "@/components/diagnosis/camera-frame";
import { DiagnosisResultCard } from "@/components/diagnosis/result-card";
import { UploadPanel } from "@/components/diagnosis/upload-panel";
import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { djangoClassifyLeafImage, type DjangoCnnPrediction, type DjangoCnnResponse } from "@/lib/django-client";
import { createDiagnosisRecord } from "@/lib/diagnoses-client";
import { compressImage } from "@/lib/image-compression";
import { createPreviewDataUrl, detectLeafInImage, type LeafDetectionResult } from "@/lib/leaf-detector";
import { addOfflineDiagnosis, clearOfflineDiagnosis, getOfflineQueue } from "@/lib/offline-queue";
import { formatConfidence } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useVoiceInput } from "@/hooks/use-voice-input";
import {
  CameraPreviewState,
  ActionPlan,
  DiagnosisInputMethod,
  DiagnosisRecord,
  DiagnosisStatus,
  DiagnosisStepState,
} from "@/types";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";

const inputMethodLabelMap: Record<DiagnosisInputMethod, string> = {
  upload: "ảnh tải lên",
  capture: "ảnh chụp",
  sample: "ảnh mẫu",
};

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isHealthyCnnDisease(cnn: DjangoCnnResponse) {
  const disease = `${cnn.disease_name || ""} ${cnn.disease_name_en || ""}`.toLowerCase();
  return disease.includes("healthy") || disease.includes("khỏe") || disease.includes("khoe");
}

function isBackendLeafReject(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("yolo") ||
    message.includes("không phát hiện") ||
    message.includes("khong phat hien") ||
    message.includes("không phải ảnh lá") ||
    message.includes("khong phai anh la") ||
    message.includes("chụp rõ") ||
    message.includes("chup ro")
  );
}

type PendingCnnReview = {
  baseRecord: DiagnosisRecord;
  cnn: DjangoCnnResponse;
};

type DiseaseGuidance = {
  risk: ActionPlan["risk_level"];
  severity: string;
  immediate: string[];
  followUp: string[];
  safety: string[];
  recheckDays: number;
  expertRequired: boolean;
};

const symptomRules = [
  { symptoms: ["dom", "spot", "lesion", "vết", "vet"], diseases: ["spot", "scab", "septoria", "target", "bacterial"] },
  { symptoms: ["chay", "kho", "héo", "heo", "mép", "mep", "blight"], diseases: ["blight", "scorch", "burn"] },
  { symptoms: ["moc", "phan", "trang", "mildew"], diseases: ["mildew", "mold", "powdery"] },
  { symptoms: ["gi", "rust", "cam"], diseases: ["rust"] },
  { symptoms: ["thoi", "den", "nhun", "rot"], diseases: ["rot", "black"] },
  { symptoms: ["xoan", "vang", "virus", "khảm", "kham", "mosaic"], diseases: ["virus", "curl", "mosaic", "yellow"] },
  { symptoms: ["nhen", "mite", "to nho", "tơ"], diseases: ["mite", "spider"] },
  { symptoms: ["sau", "con trung", "bo tri", "bo trĩ", "rep"], diseases: ["insect", "pest", "mite"] },
];

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPredictionText(prediction: DjangoCnnPrediction) {
  return normalizeSearchText(
    [
      prediction.class_name,
      prediction.plant_name,
      prediction.disease_name,
      prediction.plant_name_en,
      prediction.disease_name_en,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function scorePredictionBySymptoms(prediction: DjangoCnnPrediction, symptoms: string) {
  if (!symptoms.trim()) return prediction.confidence;

  const symptomText = normalizeSearchText(symptoms);
  const predictionText = getPredictionText(prediction);
  let boost = 0;

  for (const rule of symptomRules) {
    const hasSymptom = rule.symptoms.some((keyword) => symptomText.includes(normalizeSearchText(keyword)));
    const hasDisease = rule.diseases.some((keyword) => predictionText.includes(normalizeSearchText(keyword)));
    if (hasSymptom && hasDisease) boost += 0.08;
  }

  if (predictionText.includes(symptomText) && symptomText.length > 3) boost += 0.05;

  return prediction.confidence + Math.min(boost, 0.26);
}

function selectCnnResult(cnn: DjangoCnnResponse, symptoms: string) {
  const candidates = (cnn.top_predictions.length ? cnn.top_predictions : [cnn]).slice(0, 5);
  const ranked = [...candidates].sort((a, b) => {
    return scorePredictionBySymptoms(b, symptoms) - scorePredictionBySymptoms(a, symptoms);
  });
  const selected = symptoms.trim() ? ranked[0] : candidates[0];

  return {
    ...cnn,
    ...selected,
    confidence: selected.confidence,
    top_predictions: candidates,
  };
}

function getDiseaseGuidance(cnn: DjangoCnnResponse): DiseaseGuidance {
  const text = getPredictionText(cnn);

  if (text.includes("healthy") || text.includes("khoe")) {
    return {
      risk: "low",
      severity: "Khỏe",
      immediate: [
        "Duy trì chế độ tưới và ánh sáng hiện tại nếu cây vẫn phát triển bình thường.",
        "Tiếp tục quan sát mặt trên, mặt dưới lá và chụp lại nếu xuất hiện đốm hoặc vàng lá.",
        "Không phun thuốc khi chưa có dấu hiệu bệnh rõ ràng.",
      ],
      followUp: [
        "Kiểm tra lại sau 7 ngày hoặc sớm hơn nếu lá đổi màu.",
        "Ghi chú thời tiết, lượng tưới và phân bón để so sánh ở lần kiểm tra sau.",
      ],
      safety: ["Kết quả khỏe mạnh vẫn nên được xem là hỗ trợ, không thay thế quan sát thực địa."],
      recheckDays: 7,
      expertRequired: false,
    };
  }

  if (text.includes("blight") || text.includes("chay") || text.includes("scorch")) {
    return {
      risk: "high",
      severity: "Nguy cơ cháy lá",
      immediate: [
        "Cắt bỏ lá bị cháy nặng và gom ra khỏi khu vực trồng.",
        "Tránh tưới lên tán lá; ưu tiên tưới gốc vào buổi sáng.",
        "Tăng độ thông thoáng, giảm ẩm kéo dài quanh tán cây.",
      ],
      followUp: [
        "Theo dõi tốc độ lan trong 2 đến 3 ngày.",
        "Nếu vết cháy lan nhanh, cân nhắc hỏi kỹ thuật viên địa phương trước khi dùng thuốc.",
      ],
      safety: ["Không trộn nhiều loại thuốc cùng lúc; luôn đọc nhãn và dùng bảo hộ khi xử lý."],
      recheckDays: 3,
      expertRequired: true,
    };
  }

  if (text.includes("spot") || text.includes("scab") || text.includes("septoria") || text.includes("dom")) {
    return {
      risk: "medium",
      severity: "Đốm lá",
      immediate: [
        "Tỉa bỏ các lá có nhiều đốm và không ủ trực tiếp vào gốc.",
        "Giữ lá khô, hạn chế tưới phun mưa vào chiều tối.",
        "Vệ sinh dụng cụ cắt tỉa trước khi chuyển sang cây khác.",
      ],
      followUp: [
        "Chụp lại cùng vị trí sau 3 đến 5 ngày để so sánh mật độ đốm.",
        "Nếu đốm tăng nhanh, cân nhắc biện pháp phòng nấm/vi khuẩn phù hợp với cây trồng.",
      ],
      safety: ["Không dùng thuốc khi cây đang stress nặng do nắng nóng hoặc thiếu nước."],
      recheckDays: 4,
      expertRequired: false,
    };
  }

  if (text.includes("mildew") || text.includes("mold") || text.includes("phan") || text.includes("moc")) {
    return {
      risk: "medium",
      severity: "Mốc/phấn lá",
      immediate: [
        "Tăng thông gió và giãn khoảng cách giữa các cây nếu trồng quá dày.",
        "Loại bỏ lá có lớp mốc/phấn dày để giảm nguồn lây.",
        "Tránh để lá ẩm qua đêm.",
      ],
      followUp: [
        "Quan sát mặt dưới lá sau 2 đến 3 ngày.",
        "Nếu mốc lan rộng, hỏi chuyên gia về chế phẩm sinh học hoặc thuốc phù hợp.",
      ],
      safety: ["Không phun lưu huỳnh hoặc chế phẩm mạnh khi trời quá nóng."],
      recheckDays: 3,
      expertRequired: false,
    };
  }

  if (text.includes("rust") || text.includes("gi")) {
    return {
      risk: "medium",
      severity: "Gỉ lá",
      immediate: [
        "Cắt bỏ lá có ổ bào tử màu vàng/cam/nâu rõ rệt.",
        "Giữ vườn thông thoáng và tránh tưới ướt lá.",
        "Thu gom lá rụng để giảm nguồn bệnh tồn dư.",
      ],
      followUp: [
        "Theo dõi mặt dưới lá trong 3 ngày tới.",
        "Nếu xuất hiện nhiều ổ gỉ mới, cần tư vấn thuốc đặc trị theo cây trồng.",
      ],
      safety: ["Dùng găng tay khi loại bỏ lá bệnh và rửa tay sau khi xử lý."],
      recheckDays: 3,
      expertRequired: false,
    };
  }

  if (text.includes("rot") || text.includes("thoi") || text.includes("black")) {
    return {
      risk: "high",
      severity: "Thối/đen mô lá",
      immediate: [
        "Ngừng tưới quá nhiều và kiểm tra thoát nước của đất/chậu.",
        "Loại bỏ phần lá hoặc mô bị thối mềm, có mùi hoặc chuyển đen.",
        "Tách cây nghi nhiễm nặng khỏi cây khỏe nếu trồng gần nhau.",
      ],
      followUp: [
        "Theo dõi thân, cuống và rễ trong 2 ngày.",
        "Nếu thối lan xuống thân hoặc rễ, cần chuyên gia kiểm tra trực tiếp.",
      ],
      safety: ["Không dùng lại đất/chậu bẩn cho cây khác nếu nghi có mầm bệnh."],
      recheckDays: 2,
      expertRequired: true,
    };
  }

  if (text.includes("virus") || text.includes("curl") || text.includes("mosaic") || text.includes("yellow")) {
    return {
      risk: "high",
      severity: "Nghi virus/xoăn vàng",
      immediate: [
        "Cách ly cây nghi nhiễm để hạn chế côn trùng truyền bệnh lan sang cây khác.",
        "Kiểm tra rệp, bọ phấn, bọ trĩ ở mặt dưới lá và đọt non.",
        "Không lấy giống, cành chiết hoặc hạt từ cây đang nghi nhiễm.",
      ],
      followUp: [
        "Chụp ảnh toàn cây và đọt non sau 2 đến 3 ngày.",
        "Nếu cây còi cọc, xoăn lá tăng nhanh, nên hỏi kỹ thuật viên trước khi giữ lại cây.",
      ],
      safety: ["Virus thường khó chữa bằng thuốc; tránh phun thuốc tràn lan gây tốn kém và tồn dư."],
      recheckDays: 3,
      expertRequired: true,
    };
  }

  if (text.includes("mite") || text.includes("spider") || text.includes("nhen")) {
    return {
      risk: "medium",
      severity: "Nghi nhện hại",
      immediate: [
        "Soi mặt dưới lá để tìm chấm nhỏ di chuyển hoặc tơ mịn.",
        "Phun rửa nhẹ bằng nước sạch để giảm mật số ban đầu nếu cây chịu được.",
        "Tách cây bị nặng và tránh để khô nóng kéo dài.",
      ],
      followUp: [
        "Kiểm tra lại sau 2 ngày, nhất là mặt dưới lá non.",
        "Nếu mật số tăng, dùng biện pháp sinh học hoặc thuốc theo khuyến cáo địa phương.",
      ],
      safety: ["Không lạm dụng thuốc trừ sâu phổ rộng vì có thể làm giảm thiên địch."],
      recheckDays: 2,
      expertRequired: false,
    };
  }

  return {
    risk: "medium",
    severity: "Cần theo dõi",
    immediate: [
      "Khoanh vùng lá có dấu hiệu rõ nhất và chụp thêm ảnh ở mặt trên, mặt dưới lá.",
      "Giữ cây thông thoáng, tránh tưới lên lá vào chiều tối.",
      "Ghi lại thời điểm phát hiện, thời tiết gần đây và cách chăm sóc.",
    ],
    followUp: [
      "Kiểm tra lại sau 3 đến 5 ngày để xem triệu chứng có lan không.",
      "Nếu cây suy nhanh hoặc bệnh lan rộng, nên hỏi chuyên gia nông nghiệp địa phương.",
    ],
    safety: ["Chỉ dùng thuốc khi đã xác định rõ nhóm nguyên nhân và đúng hướng dẫn trên nhãn."],
    recheckDays: 4,
    expertRequired: false,
  };
}

function buildDiseaseActionPlan(cnn: DjangoCnnResponse): ActionPlan {
  const guidance = getDiseaseGuidance(cnn);

  return {
    risk_level: guidance.risk,
    immediate_actions: guidance.immediate,
    follow_up_actions: guidance.followUp,
    expert_required: guidance.expertRequired,
    recheck_after_days: guidance.recheckDays,
    should_retake_photo: !isHealthyCnnDisease(cnn),
    safety_notes: guidance.safety,
    disclaimer:
      "Khuyến nghị dựa trên kết quả CNN và mô tả triệu chứng nếu có; hãy đối chiếu thực địa trước khi xử lý.",
    severity: guidance.severity,
  };
}

function buildGeneratedRecord({
  previewUrl,
  detection,
  inputMethod,
}: {
  previewUrl: string;
  detection: LeafDetectionResult;
  inputMethod: DiagnosisInputMethod;
}): DiagnosisRecord {
  return {
    id: `user-${Date.now()}`,
    plant: "Chưa xác định loại cây",
    disease: "Ảnh lá đã được xác nhận",
    confidence: detection.confidence,
    severity: "Đã kiểm tra",
    classificationReady: false,
    image: previewUrl,
    createdAt: new Date().toISOString(),
    note: `Hệ thống đã xác nhận ${inputMethodLabelMap[inputMethod]} là ảnh lá hợp lệ.`,
    yoloVerified: true,
    leafConfidence: detection.confidence,
    leafCheckNote: detection.reason,
    inputMethod,
    origin: "user",
    symptomSummary:
      "Ảnh này đã qua bước kiểm tra đầu vào và có thể lưu lại để dùng cho các bước tiếp theo.",
    causes: [
      `Mức nhận biết phần lá đạt ${formatConfidence(detection.plantLikeRatio)}.`,
      `Mức nhận biết vùng màu xanh đạt ${formatConfidence(detection.greenRatio)}.`,
      `${inputMethodLabelMap[inputMethod]} đã được đọc ổn định trên trình duyệt.`,
    ],
    recommendations: [
      {
        title: "Bạn có thể làm tiếp",
        items: [
          "Lưu ảnh này để xem lại sau.",
          "Chụp thêm 2 đến 3 ảnh ở các góc khác nhau để dễ theo dõi hơn.",
          "Mở phần chat để hỏi AI hoặc chuyên gia về bước tiếp theo.",
        ],
      },
      {
        title: "Để ảnh rõ hơn",
        items: [
          "Ưu tiên đủ sáng và nền gọn.",
          "Đưa chiếc lá vào gần giữa khung hình.",
          "Tránh rung tay hoặc để vật khác che lá.",
        ],
      },
    ],
  };
}

function applyCnnResult(record: DiagnosisRecord, cnn: DjangoCnnResponse, symptoms = ""): DiagnosisRecord {
  const finalCnn = selectCnnResult(cnn, symptoms);
  const actionPlan = buildDiseaseActionPlan(finalCnn);
  const topItems = finalCnn.top_predictions.slice(0, 5).map((item) => {
    const symptomScore = symptoms.trim() ? `, điểm triệu chứng ${formatConfidence(Math.min(scorePredictionBySymptoms(item, symptoms), 1))}` : "";
    return `${item.plant_name || "Cây"} - ${item.disease_name}: ${formatConfidence(item.confidence)}${symptomScore}`;
  });
  const isHealthy = isHealthyCnnDisease(finalCnn);
  const symptomNote = symptoms.trim()
    ? `Người dùng mô tả thêm triệu chứng: "${symptoms.trim()}". Hệ thống đã đối chiếu mô tả này với 5 kết quả CNN cao nhất để chọn khả nghi nhất.`
    : "Người dùng chọn không nhập triệu chứng, hệ thống giữ kết quả CNN có độ tin cậy cao nhất.";

  return {
    ...record,
    leafConfidence: finalCnn.yolo_payload?.confidence ?? record.leafConfidence,
    leafCheckNote: finalCnn.yolo_payload?.reason ?? record.leafCheckNote,
    plant: finalCnn.plant_name || record.plant,
    disease: finalCnn.disease_name || finalCnn.class_name || record.disease,
    confidence: finalCnn.confidence,
    severity: actionPlan.severity ?? (isHealthy ? "Khỏe" : "CNN"),
    classificationReady: true,
    note: `CNN đã phân loại ảnh với độ tin cậy ${formatConfidence(finalCnn.confidence)}. ${symptomNote}`,
    symptomSummary:
      isHealthy
        ? "CNN nhận định ảnh lá hiện tại thuộc nhóm khỏe mạnh. Bạn vẫn nên tiếp tục theo dõi nếu cây có dấu hiệu bất thường ngoài thực địa."
        : symptoms.trim()
          ? `Kết quả cuối cùng nghiêng về ${finalCnn.disease_name || finalCnn.class_name} sau khi kết hợp CNN với triệu chứng người dùng mô tả: ${symptoms.trim()}.`
          : `CNN nhận định ảnh có khả năng thuộc nhóm ${finalCnn.disease_name || finalCnn.class_name}. Kết quả này nên được dùng như gợi ý hỗ trợ, không thay thế đánh giá thực địa.`,
    causes: [
      `Nhãn CNN cuối cùng: ${finalCnn.class_name}.`,
      `Độ tin cậy CNN: ${formatConfidence(finalCnn.confidence)}.`,
      symptoms.trim()
        ? "Có đối chiếu triệu chứng người dùng nhập với top 5 kết quả CNN."
        : "Không dùng triệu chứng bổ sung; giữ kết quả CNN cao nhất.",
      `Model: ${finalCnn.model_version}.`,
    ],
    recommendations: [
      {
        title: symptoms.trim() ? "Top 5 CNN sau khi đối chiếu triệu chứng" : "Top 5 kết quả CNN",
        items: topItems.length ? topItems : ["CNN đã trả về một nhãn phân loại chính cho ảnh này."],
      },
      {
        title: `Khuyến nghị hành động cho ${finalCnn.disease_name || finalCnn.class_name}`,
        items: actionPlan.immediate_actions,
      },
      ...record.recommendations,
    ],
    cnnConfidence: finalCnn.confidence,
    cnnPayload: {
      ...(finalCnn as unknown as Record<string, unknown>),
      symptom_input: symptoms.trim() || null,
      symptom_reranked: Boolean(symptoms.trim()),
    },
    actionPlan,
    modelVersion: finalCnn.model_version,
  };
}

export default function DashboardDiagnosisPage() {
  const { user, accessToken } = useSessionStore();
  const { addGeneratedRecord } = useDiagnosisStore();
  const [status, setStatus] = useState<DiagnosisStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);
  const [pendingCnnReview, setPendingCnnReview] = useState<PendingCnnReview | null>(null);
  const [symptomText, setSymptomText] = useState("");
  const [leafAnalysis, setLeafAnalysis] = useState<LeafDetectionResult | null>(null);
  const [inputMethod, setInputMethod] = useState<DiagnosisInputMethod | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraState, setCameraState] = useState<CameraPreviewState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [offlineCount, setOfflineCount] = useState(0);
  const [voiceNote, setVoiceNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const syncingOfflineRef = useRef(false);
  const online = useOnlineStatus();
  const voice = useVoiceInput({ onTranscript: (value) => setVoiceNote(value) });

  const currentPlan = user?.currentPlan ?? "seed";
  const busy = status === "uploading" || status === "scanning";
  const chatLocked = currentPlan === "seed";

  useEffect(() => {
    setCameraSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setOfflineCount(getOfflineQueue().filter((item) => item.status === "pending").length);
    };
    refresh();
    window.addEventListener("agromind-offline-queue", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("agromind-offline-queue", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  useEffect(() => {
    if (!online || syncingOfflineRef.current) return;

    const pending = getOfflineQueue().filter((item) => item.status === "pending");
    if (!pending.length) return;

    syncingOfflineRef.current = true;
    void (async () => {
      for (const item of pending) {
        try {
          const detection = await detectLeafInImage(item.imageDataUrl);
          const cnn = await djangoClassifyLeafImage({
            imageDataUrl: item.imageDataUrl,
            accessToken,
          });
          const baseRecord = buildGeneratedRecord({
            previewUrl: item.imageDataUrl,
            detection,
            inputMethod: "upload",
          });
          const savedRecord = await createDiagnosisRecord(accessToken, applyCnnResult(baseRecord, cnn));
          addGeneratedRecord(savedRecord);
          clearOfflineDiagnosis(item.id);
        } catch {
          break;
        }
      }
      setOfflineCount(getOfflineQueue().filter((item) => item.status === "pending").length);
      syncingOfflineRef.current = false;
    })();
  }, [accessToken, addGeneratedRecord, online]);

  function stopCameraStream(nextState: CameraPreviewState = "idle") {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraError(null);
    setCameraState(nextState);
  }

  async function openCamera(nextFacingMode = cameraFacingMode) {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraState("unsupported");
      setCameraError("Trình duyệt hiện tại chưa hỗ trợ camera trực tiếp. Bạn có thể tải ảnh từ thiết bị.");
      return;
    }

    stopCameraStream("idle");
    setCameraState("starting");
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setCameraState("live");
    } catch {
      stopCameraStream("error");
      setCameraError("Không thể mở camera. Hãy cho phép truy cập camera hoặc chuyển sang tải ảnh.");
    }
  }

  async function captureFromCamera() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraState("error");
      setCameraError("Camera chưa sẵn sàng để chụp. Hãy thử mở lại camera.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraState("error");
      setCameraError("Thiết bị hiện tại không hỗ trợ chụp ảnh từ camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraState("error");
      setCameraError("Không thể lấy ảnh từ camera. Hãy thử lại.");
      return;
    }

    stopCameraStream();

    const file = new File([blob], `leafiq-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    await applySelectedFile(file, "capture");
  }

  function handleSwitchCamera() {
    const nextFacingMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacingMode);
    void openCamera(nextFacingMode);
  }

  const processSteps = useMemo<StepItem[]>(() => {
    const checkState: DiagnosisStepState =
      status === "invalid-image"
        ? "warning"
        : status === "scanning"
          ? "processing"
          : status === "success" || status === "symptom-review"
            ? "success"
            : previewUrl
              ? "queued"
              : "idle";

    const saveState: DiagnosisStepState =
      status === "success" ? "success" : status === "symptom-review" ? "processing" : previewUrl ? "queued" : "idle";

    const chatState: DiagnosisStepState = chatLocked
      ? "locked"
      : status === "success"
        ? "success"
        : previewUrl
          ? "queued"
          : "idle";

    return [
      {
        key: "yolo",
        title: "Kiểm tra ảnh",
        description: "Hệ thống xem ảnh bạn gửi có đúng là lá cây hay không.",
        state: checkState,
        detail:
          status === "invalid-image"
            ? leafAnalysis?.reason ?? "Ảnh này chưa đủ điều kiện để xác nhận là lá cây."
            : status === "success" || status === "symptom-review"
              ? `Ảnh đã được xác nhận là lá cây với độ tin cậy ${formatConfidence(
                  leafAnalysis?.confidence ?? 0,
                )}.`
              : status === "scanning"
                ? "Đang kiểm tra nội dung ảnh..."
                : "Chọn ảnh để bắt đầu.",
      },
      {
        key: "roadmap",
        title: "Lưu kết quả",
        description: "Ảnh hợp lệ sẽ được lưu để bạn xem lại sau.",
        state: saveState,
        detail:
          status === "success"
            ? "Ảnh đã được lưu để dùng lại trong các bước tiếp theo."
            : status === "symptom-review"
              ? "CNN đã có kết quả. Hãy nhập triệu chứng hoặc chọn bỏ qua để lưu bản ghi cuối cùng."
            : "Sau khi ảnh hợp lệ, hệ thống sẽ lưu lại cho bạn.",
      },
      {
        key: "rag",
        title: "Chat hỗ trợ",
        description: "Sau khi có ảnh hợp lệ, bạn có thể tiếp tục hỏi AI hoặc chuyên gia.",
        state: chatState,
        detail: chatLocked
          ? "Gói hiện tại chỉ xem được kết quả kiểm tra ảnh."
          : status === "success"
            ? "Ảnh này đã sẵn sàng để dùng tiếp trong phần chat."
            : "Hoàn tất kiểm tra ảnh để tiếp tục sang phần chat.",
      },
    ];
  }, [chatLocked, leafAnalysis, previewUrl, status]);

  async function applySelectedFile(file: File, method: DiagnosisInputMethod) {
    try {
      stopCameraStream();
      const compressedFile = await compressImage(file);
      const nextUrl = await createPreviewDataUrl(compressedFile);
      setPreviewUrl(nextUrl);
      setInputMethod(method);
      setSelectedRecord(null);
      setPendingCnnReview(null);
      setSymptomText("");
      setLeafAnalysis(null);
      setStatus("idle");
    } catch {
      setPreviewUrl(null);
      setInputMethod(null);
      setSelectedRecord(null);
      setPendingCnnReview(null);
      setSymptomText("");
      setLeafAnalysis(null);
      setStatus("invalid-image");
    }
  }

  async function handleStartDiagnosis() {
    if (!previewUrl || !inputMethod) {
      setLeafAnalysis({
        isLeaf: false,
        confidence: 0,
        greenRatio: 0,
        plantLikeRatio: 0,
        averageSaturation: 0,
        reason: "Bạn cần tải ảnh hoặc chụp ảnh lá thật trước khi bắt đầu kiểm tra.",
      });
      setStatus("invalid-image");
      return;
    }

    const activePreview = previewUrl;
    const activeMethod = inputMethod;

    setStatus("uploading");
    setSelectedRecord(null);
    setPendingCnnReview(null);
    setSymptomText("");
    setLeafAnalysis(null);

    await delay(350);
    setStatus("scanning");

    try {
      const detection = await detectLeafInImage(activePreview);
      setLeafAnalysis(detection);
      await delay(900);

      if (!detection.isLeaf) {
        setStatus("invalid-image");
        return;
      }

      let generatedRecord = buildGeneratedRecord({
        previewUrl: activePreview,
        detection,
        inputMethod: activeMethod,
      });

      if (activePreview.startsWith("data:")) {
        try {
          if (!online) {
            addOfflineDiagnosis(activePreview);
            throw new Error("offline");
          }
          const cnn = await djangoClassifyLeafImage({
            imageDataUrl: activePreview,
            accessToken,
          });
          setPendingCnnReview({
            baseRecord: generatedRecord,
            cnn,
          });
          setSymptomText("");
          setStatus("symptom-review");
          return;
        } catch (error) {
          if (isBackendLeafReject(error)) {
            setLeafAnalysis({
              isLeaf: false,
              confidence: 0.12,
              greenRatio: detection.greenRatio,
              plantLikeRatio: detection.plantLikeRatio,
              averageSaturation: detection.averageSaturation,
              reason:
                error instanceof Error
                  ? error.message
                  : "YOLO không phát hiện được lá cây. Hãy chụp rõ hơn hoặc kiểm tra lại đây có phải ảnh lá hay không.",
            });
            setStatus("invalid-image");
            return;
          }
          // Keep the browser-side leaf validation result if backend CNN is unavailable.
        }
      }

      const savedRecord = await createDiagnosisRecord(accessToken, generatedRecord);
      setSelectedRecord(savedRecord);
      addGeneratedRecord(savedRecord);
      setStatus("success");
      setRunCount((value) => value + 1);
    } catch {
      setLeafAnalysis({
        isLeaf: false,
        confidence: 0.12,
        greenRatio: 0,
        plantLikeRatio: 0,
        averageSaturation: 0,
        reason: "Không thể đọc ảnh này để kiểm tra. Hãy thử ảnh khác rõ hơn.",
      });
      setStatus("invalid-image");
    }
  }

  async function finalizeDiagnosisWithSymptoms(symptoms: string) {
    if (!pendingCnnReview) return;

    setStatus("scanning");

    try {
      const finalRecord = applyCnnResult(pendingCnnReview.baseRecord, pendingCnnReview.cnn, symptoms);
      const savedRecord = await createDiagnosisRecord(accessToken, finalRecord);
      setSelectedRecord(savedRecord);
      addGeneratedRecord(savedRecord);
      setPendingCnnReview(null);
      setSymptomText("");
      setStatus("success");
      setRunCount((value) => value + 1);
    } catch {
      setLeafAnalysis({
        isLeaf: false,
        confidence: 0.12,
        greenRatio: leafAnalysis?.greenRatio ?? 0,
        plantLikeRatio: leafAnalysis?.plantLikeRatio ?? 0,
        averageSaturation: leafAnalysis?.averageSaturation ?? 0,
        reason: "Không thể lưu kết quả chẩn đoán cuối cùng. Hãy kiểm tra đăng nhập/backend rồi thử lại.",
      });
      setStatus("invalid-image");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <UploadPanel
          status={status}
          busy={busy}
          cameraSupported={cameraSupported}
          onFileSelected={applySelectedFile}
          onOpenCamera={() => {
            void openCamera();
          }}
          onStart={() => {
            void handleStartDiagnosis();
          }}
        />
        <CameraFrame
          previewUrl={previewUrl}
          busy={busy}
          cameraState={cameraState}
          cameraError={cameraError}
          videoRef={videoRef}
          onOpenCamera={() => {
            void openCamera();
          }}
          onCapture={() => {
            void captureFromCamera();
          }}
          onCloseCamera={() => stopCameraStream()}
          onSwitchCamera={handleSwitchCamera}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="brand">Gói hiện tại: {currentPlan.toUpperCase()}</Badge>
        <Badge variant={online ? "success" : "warning"}>{online ? "Đang online" : "Mất mạng"}</Badge>
        {offlineCount ? <Badge variant="warning">{offlineCount} ảnh đang chờ gửi lại</Badge> : null}
        <Button
          variant="secondary"
          onClick={() => {
            if (voice.listening) {
              voice.stop();
            } else {
              voice.start();
            }
          }}
          disabled={!voice.supported}
        >
          {voice.listening ? "Dừng ghi âm" : "Nói ghi chú"}
        </Button>
        {selectedRecord && status === "success" ? (
          <Link
            href={`/dashboard/results/${selectedRecord.id}`}
            className={buttonVariants({ variant: "primary" })}
          >
            Xem kết quả
          </Link>
        ) : null}
        {selectedRecord && status === "success" ? (
          <Link href="/dashboard/chat" className={buttonVariants({ variant: "secondary" })}>
            <MessageSquareText size={16} />
            Mở chat
          </Link>
        ) : null}
      </div>

      <Card className="rounded-[30px] border-white/10 bg-white/5 text-white">
        <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Hướng dẫn chụp ảnh rõ nét
            </p>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-emerald-50/75 sm:grid-cols-2">
              <span>- Chụp gần lá, đủ sáng.</span>
              <span>- Giữ máy chắc, không rung.</span>
              <span>- Để lá chiếm phần lớn khung hình.</span>
              <span>- Chụp thêm mặt dưới lá nếu có đốm.</span>
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-emerald-50/75">
            {voice.supported
              ? voiceNote || voice.transcript || "Bấm micro để ghi chú bằng giọng nói tiếng Việt."
              : "Trình duyệt này chưa hỗ trợ nhập giọng nói. Bạn vẫn có thể nhập câu hỏi trong Chat AI."}
          </div>
        </div>
      </Card>

      {leafAnalysis ? (
        <Card className="rounded-[30px] border-emerald-100 bg-white/90">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Độ tin cậy
              </p>
              <p className="mt-3 font-display text-3xl font-semibold text-ink">
                {formatConfidence(leafAnalysis.confidence)}
              </p>
            </div>
            <div className="rounded-[24px] bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Phần lá nhận biết được
              </p>
              <p className="mt-3 font-display text-3xl font-semibold text-ink">
                {formatConfidence(leafAnalysis.plantLikeRatio)}
              </p>
            </div>
            <div className="rounded-[24px] bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Màu xanh nhận biết được
              </p>
              <p className="mt-3 font-display text-3xl font-semibold text-ink">
                {formatConfidence(leafAnalysis.greenRatio)}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {pendingCnnReview && status === "symptom-review" ? (
        <Card className="rounded-[32px] border-emerald-100 bg-white/95 shadow-panel">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Bước 2 · Triệu chứng quan sát được
              </p>
              <h3 className="mt-3 font-display text-3xl font-semibold text-ink">
                Thêm triệu chứng để chọn kết quả khả nghi nhất trong top 5 CNN
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Nếu bạn nhập triệu chứng, Agromind AI sẽ đối chiếu mô tả với 5 kết quả CNN cao nhất rồi chọn kết quả
                cuối cùng. Nếu không nhập, hệ thống giữ nguyên kết quả CNN có độ tin cậy cao nhất.
              </p>

              <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-950">Top 5 CNN hiện tại</p>
                <div className="mt-3 space-y-2">
                  {pendingCnnReview.cnn.top_predictions.slice(0, 5).map((item, index) => (
                    <div
                      key={`${item.class_name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/85 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {index + 1}. {item.plant_name || "Cây"} · {item.disease_name || item.class_name}
                      </span>
                      <span className="shrink-0 font-semibold text-emerald-700">
                        {formatConfidence(item.confidence)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-soft">
              <label htmlFor="symptom-text" className="text-sm font-semibold text-slate-900">
                Mô tả triệu chứng nếu có
              </label>
              <textarea
                id="symptom-text"
                value={symptomText}
                onChange={(event) => setSymptomText(event.target.value)}
                rows={7}
                className="mt-3 w-full resize-none rounded-[22px] border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                placeholder="Ví dụ: lá có đốm nâu lan từ mép, mặt dưới hơi mốc trắng, cây mới mưa nhiều 3 ngày..."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => {
                    void finalizeDiagnosisWithSymptoms(symptomText);
                  }}
                  disabled={!symptomText.trim()}
                >
                  Dùng triệu chứng
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void finalizeDiagnosisWithSymptoms("");
                  }}
                >
                  Không nhập triệu chứng
                </Button>
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                Triệu chứng chỉ dùng để chọn lại trong top 5 CNN, không tạo bệnh mới ngoài các kết quả mô hình đã trả về.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {status === "invalid-image" ? (
        <Card className="rounded-[30px] border-amber-200 bg-amber-50">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold text-amber-950">
                Ảnh này chưa được xác nhận là lá cây
              </h3>
              <p className="mt-3 text-sm leading-7 text-amber-900/80">
                {leafAnalysis?.reason ??
                  "Hãy thử chụp gần hơn vào lá, tăng ánh sáng hoặc đổi sang một ảnh rõ hơn."}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <AIProcessStepper steps={processSteps} />

      <DiagnosisResultCard
        record={selectedRecord}
        locked={chatLocked && status === "success"}
        onUpgrade={() => setUpgradeOpen(true)}
      />

      <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <Sparkles size={18} className="text-lime-200" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold">
              Hiện tại hệ thống tập trung vào bước kiểm tra ảnh lá
            </h3>
            <p className="mt-2 text-sm leading-7 text-emerald-50/75">
              Bạn chỉ cần tải ảnh hoặc chụp ảnh. Nếu ảnh phù hợp, hệ thống sẽ lưu lại để bạn xem lại và tiếp tục sử dụng ở các bước sau.
            </p>
          </div>
        </div>
      </Card>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
