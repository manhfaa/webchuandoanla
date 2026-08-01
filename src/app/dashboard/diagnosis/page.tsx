"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, MessageSquareText, Mic, PlayCircle, Sparkles } from "lucide-react";

import { AIProcessStepper } from "@/components/diagnosis/ai-process-stepper";
import type { StepItem } from "@/components/diagnosis/ai-process-stepper";
import { CameraFrame } from "@/components/diagnosis/camera-frame";
import { CropPicker } from "@/components/diagnosis/crop-picker";
import { DiagnosisResultCard } from "@/components/diagnosis/result-card";
import { UploadPanel } from "@/components/diagnosis/upload-panel";
import { WizardShell, type WizardStepId } from "@/components/diagnosis/wizard-shell";
import { QuotaHint } from "@/components/plan/quota-hint";
import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { djangoClassifyLeafImage, type DjangoCnnPrediction, type DjangoCnnResponse } from "@/lib/django-client";
import { findCrop, scopePredictionsToCrop } from "@/lib/crop-filter";
import { createDiagnosisRecord, fetchDiagnosisUsage } from "@/lib/diagnoses-client";
import { compressImage } from "@/lib/image-compression";
import { createPreviewDataUrl, detectLeafInImage, type LeafDetectionResult } from "@/lib/leaf-detector";
import { addOfflineDiagnosis, clearOfflineDiagnosis, getOfflineQueue } from "@/lib/offline-queue";
import { cn, formatConfidence } from "@/lib/utils";
import { useEntitlements } from "@/lib/use-entitlements";
import { useTr } from "@/lib/use-tr";
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

const CROP_STORAGE_KEY = "agromind-diagnosis-crop";

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

type SymptomResearchSource = {
  id: number;
  title: string;
  url: string;
  snippet?: string;
};

type SymptomResearchResult = {
  skipped?: boolean;
  available?: boolean;
  compatibilityQuestion?: string;
  compatibilityQuery?: string;
  isSymptomConsistent?: boolean;
  bestMatch?: string;
  compatibilitySummary?: string;
  confidenceNote?: string;
  compatibilitySources?: SymptomResearchSource[];
  treatmentQuestion?: string;
  treatmentQuery?: string | null;
  treatmentSummary?: string | null;
  treatmentSafetyNote?: string | null;
  treatmentSources?: SymptomResearchSource[];
  finalConclusion?: string;
  userNextStep?: string;
  generatedAt?: string;
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

function selectCnnResult(cnn: DjangoCnnResponse, symptoms: string, cropId?: string | null) {
  const everything = (cnn.top_predictions.length ? cnn.top_predictions : [cnn]).slice(0, 5);
  // Narrow to the declared crop. On a miss this hands back the full list with
  // cropMatched === false rather than an empty one, so the UI can say "none of
  // these are <crop>" instead of showing a blank panel or promoting the crop's
  // best guess from somewhere deep in the ranking.
  const { candidates, cropMatched } = scopePredictionsToCrop(everything, cropId);
  const ranked = [...candidates].sort((a, b) => {
    return scorePredictionBySymptoms(b, symptoms) - scorePredictionBySymptoms(a, symptoms);
  });
  const selected = symptoms.trim() ? ranked[0] : candidates[0];

  return {
    ...cnn,
    ...selected,
    confidence: selected.confidence,
    top_predictions: candidates,
    cropFilter: { cropId: cropId ?? null, matched: cropMatched, allPredictions: everything },
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
      "Khuyến nghị dựa trên ảnh và mô tả triệu chứng nếu có; hãy đối chiếu thực địa trước khi xử lý.",
    severity: guidance.severity,
  };
}

function formatResearchSources(sources?: SymptomResearchSource[]) {
  const usableSources = (sources ?? []).filter((source) => source.url).slice(0, 5);
  if (!usableSources.length) return ["Chưa có nguồn web đủ rõ để hiển thị."];
  return usableSources.map((source) => `[${source.id}] ${source.title}: ${source.url}`);
}

function buildResearchRecommendationBlocks(research?: SymptomResearchResult | null) {
  if (!research || research.skipped) return [];

  const blocks = [
    {
      title: research.isSymptomConsistent
        ? "Đối chiếu triệu chứng với nguồn tham khảo"
        : "Triệu chứng cần được quan sát thêm",
      items: [
        research.compatibilitySummary ||
          "Đã tìm nguồn tham khảo để đối chiếu triệu chứng với các khả năng từ ảnh.",
        research.confidenceNote ||
          "Nguồn web chỉ dùng để tăng độ tin cậy tham khảo, không thay thế kiểm tra thực địa.",
        research.compatibilityQuestion ? `Câu hỏi kiểm chứng: ${research.compatibilityQuestion}` : "",
        ...formatResearchSources(research.compatibilitySources),
      ].filter(Boolean),
    },
  ];

  if (research.isSymptomConsistent && research.treatmentSummary) {
    blocks.push({
      title: "Phương pháp xử lý từ nguồn tham khảo",
      items: [
        research.treatmentSummary,
        research.treatmentSafetyNote || "",
        research.treatmentQuestion ? `Câu hỏi xử lý: ${research.treatmentQuestion}` : "",
        ...formatResearchSources(research.treatmentSources),
      ].filter(Boolean),
    });
  }

  if (research.finalConclusion) {
    blocks.push({
      title: "Kết luận sau khi đối chiếu",
      items: [
        research.finalConclusion,
        research.userNextStep ? `Bước tiếp theo: ${research.userNextStep}` : "",
      ].filter(Boolean),
    });
  }

  return blocks;
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

async function researchSymptomsWithSources({
  symptoms,
  cnn,
  accessToken,
  cropId,
}: {
  symptoms: string;
  cnn: DjangoCnnResponse;
  accessToken: string | null;
  cropId?: string | null;
}) {
  if (!symptoms.trim()) return null;

  // Same narrowing the UI applied, so the web research is done on the disease
  // the user is actually being shown rather than on a candidate the crop filter
  // already ruled out.
  const selectedPrediction = selectCnnResult(cnn, symptoms, cropId);
  const response = await fetch("/api/research-symptoms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      symptoms,
      selectedPrediction,
      topPredictions: selectedPrediction.top_predictions.slice(0, 5),
    }),
  });

  if (!response.ok) {
    throw new Error("Chưa thể đối chiếu triệu chứng với nguồn tham khảo. Vui lòng thử lại sau ít phút.");
  }
  return (await response.json()) as SymptomResearchResult;
}

function applyCnnResult(
  record: DiagnosisRecord,
  cnn: DjangoCnnResponse,
  symptoms = "",
  research?: SymptomResearchResult | null,
  cropId?: string | null,
): DiagnosisRecord {
  const finalCnn = selectCnnResult(cnn, symptoms, cropId);
  const crop = findCrop(cropId);
  const actionPlan = buildDiseaseActionPlan(finalCnn);
  const topItems = finalCnn.top_predictions.slice(0, 5).map((item) => {
    const symptomScore = symptoms.trim() ? `, điểm triệu chứng ${formatConfidence(Math.min(scorePredictionBySymptoms(item, symptoms), 1))}` : "";
    return `${item.plant_name || "Cây"} - ${item.disease_name}: ${formatConfidence(item.confidence)}${symptomScore}`;
  });
  const isHealthy = isHealthyCnnDisease(finalCnn);
  const symptomNote = symptoms.trim()
    ? `Người dùng mô tả thêm triệu chứng: "${symptoms.trim()}". Hệ thống đã đối chiếu mô tả này với 5 khả năng cao nhất từ ảnh.`
    : "Người dùng chọn không nhập triệu chứng, hệ thống giữ khả năng có độ tin cậy cao nhất.";

  return {
    ...record,
    leafConfidence: finalCnn.yolo_payload?.confidence ?? record.leafConfidence,
    leafCheckNote: finalCnn.yolo_payload?.reason ?? record.leafCheckNote,
    plant: finalCnn.plant_name || record.plant,
    disease: finalCnn.disease_name || finalCnn.class_name || record.disease,
    confidence: finalCnn.confidence,
    severity: actionPlan.severity ?? (isHealthy ? "Khỏe" : "Cần theo dõi"),
    classificationReady: true,
    note: `Ảnh đã được phân tích với độ tin cậy ${formatConfidence(finalCnn.confidence)}. ${symptomNote}`,
    symptomSummary:
      isHealthy
        ? "Ảnh lá hiện tại có nhiều dấu hiệu thuộc nhóm khỏe mạnh. Bạn vẫn nên tiếp tục theo dõi nếu cây có biểu hiện bất thường ngoài thực địa."
        : symptoms.trim()
          ? `Kết quả nghiêng về ${finalCnn.disease_name || finalCnn.class_name} sau khi đối chiếu ảnh với triệu chứng đã mô tả: ${symptoms.trim()}.`
          : `Ảnh có khả năng thuộc nhóm ${finalCnn.disease_name || finalCnn.class_name}. Đây là gợi ý hỗ trợ và không thay thế đánh giá thực địa.`,
    causes: [
      `Khả năng được chọn: ${finalCnn.class_name}.`,
      `Độ tin cậy: ${formatConfidence(finalCnn.confidence)}.`,
      crop
        ? finalCnn.cropFilter.matched
          ? `Đã lọc theo cây trồng bạn chọn: ${crop.name}.`
          : `Bạn chọn ${crop.name}, nhưng không khả năng nào trong 5 kết quả thuộc cây này.`
        : "",
      symptoms.trim()
        ? "Đã đối chiếu triệu chứng người dùng nhập với 5 khả năng từ ảnh."
        : "Không dùng triệu chứng bổ sung; giữ khả năng có độ tin cậy cao nhất.",
      symptoms.trim() && research
        ? research.isSymptomConsistent
          ? "Triệu chứng phù hợp với thông tin trong các nguồn tham khảo đã tìm được."
          : "Nguồn tham khảo chưa cho thấy triệu chứng phù hợp rõ ràng; cần kiểm tra thực địa kỹ hơn."
        : "",
    ].filter(Boolean),
    recommendations: [
      {
        title: crop
          ? finalCnn.cropFilter.matched
            ? `Các khả năng trên ${crop.name}`
            : `Không có khả năng nào thuộc ${crop.name}`
          : symptoms.trim()
            ? "Các khả năng sau khi đối chiếu triệu chứng"
            : "Các khả năng từ ảnh",
        items: [
          // State the miss before listing anything, so the numbers underneath are
          // never read as "these are your crop's diseases" when they are not.
          crop && finalCnn.cropFilter.matched === false
            ? `Ảnh này không giống bệnh nào trên ${crop.name} mà hệ thống nhận biết được. Dưới đây là 5 khả năng gốc từ ảnh, chưa lọc theo cây trồng — hãy kiểm tra lại loại cây đã chọn hoặc chụp lại rõ hơn.`
            : "",
          ...(topItems.length ? topItems : ["Hệ thống đã tìm được một khả năng chính cho ảnh này."]),
        ].filter(Boolean),
      },
      ...buildResearchRecommendationBlocks(research),
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
      tavily_research: research ?? null,
    },
    actionPlan,
    modelVersion: finalCnn.model_version,
  };
}

export default function DashboardDiagnosisPage() {
  const tr = useTr();
  const { user, accessToken } = useSessionStore();
  const { addGeneratedRecord } = useDiagnosisStore();
  const [status, setStatus] = useState<DiagnosisStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);
  const [pendingCnnReview, setPendingCnnReview] = useState<PendingCnnReview | null>(null);
  const [symptomText, setSymptomText] = useState("");
  const [researchError, setResearchError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
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
  const [cropId, setCropId] = useState<string | null>(null);
  // Only the first two steps are navigable by hand. Steps 3 and 4 are owned by
  // the flow: the user reaches symptoms when a CNN review is pending and the
  // result when it has been finalised, so they cannot be reached by clicking.
  const [manualStep, setManualStep] = useState<"crop" | "photo">("crop");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const syncingOfflineRef = useRef(false);
  const online = useOnlineStatus();
  const voice = useVoiceInput({ onTranscript: (value) => setVoiceNote(value) });

  const { reportUsage, quota } = useEntitlements();
  const currentPlan = user?.currentPlan ?? "seed";
  const busy = status === "uploading" || status === "scanning";
  // "Chat theo kết quả" is a cap in the catalogue, not a tier: the published
  // table sells Seed 3 câu/ngày. Naming the tier here was a second copy of that
  // cap and it disagreed with it — a Seed grower was shown an upgrade wall and
  // one bullet per recommendation for something the plan already includes. Only
  // a plan that sells none of it locks the panel.
  const resultChat = quota("daily_chat_messages");
  const chatLocked = resultChat.known && resultChat.limit === 0;

  useEffect(() => {
    setCameraSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );
  }, []);

  // A grower usually tends the same two or three crops, so re-picking on every
  // visit is pure friction on a phone. Read after mount rather than in the
  // initial state so the server and first client render agree. Validated on the
  // way in: a stale id from an older catalogue must not silently filter results
  // against a crop that no longer exists.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CROP_STORAGE_KEY);
      if (saved && findCrop(saved)) setCropId(saved);
    } catch {
      // Private mode or blocked storage: the picker just starts unset.
    }
  }, []);

  function handleCropChange(next: string | null) {
    setCropId(next);
    try {
      if (next) window.localStorage.setItem(CROP_STORAGE_KEY, next);
      else window.localStorage.removeItem(CROP_STORAGE_KEY);
    } catch {
      // Non-fatal: the choice still applies for this session.
    }
  }

  // The server counts the saved leaf checks, so the remaining quota shown here
  // is the one the 402 is measured against. `runCount` re-reads it after each
  // check, which is also what makes the number tick down as the user works.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void fetchDiagnosisUsage(accessToken)
      .then((usage) => {
        if (cancelled || !usage) return;
        reportUsage("daily_diagnoses", usage.daily_diagnoses.used);
        reportUsage("monthly_diagnoses", usage.monthly_diagnoses.used);
      })
      .catch(() => {
        // The hint falls back to stating the cap; the 402 still enforces it.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, reportUsage, runCount]);

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
          // item.cropId, not the current selection: this photo was queued earlier,
          // possibly from a different plot.
          const savedRecord = await createDiagnosisRecord(
            accessToken,
            applyCnnResult(baseRecord, cnn, "", null, item.cropId ?? null),
          );
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

    // Capture exactly what the preview shows, not the whole sensor frame.
    // The stream is requested at 1280x720 (aspect 1.78) but the preview is
    // `object-cover` in a box roughly 300x320 on a phone (aspect ~0.94), so CSS
    // was hiding about half the frame's width. Drawing the full frame meant the
    // leaf the grower had carefully centred inside the mint guides came out
    // small and off-centre, and YOLO then cropped from that wider scene — the
    // photo they framed was never the photo that got diagnosed.
    const box = video.getBoundingClientRect();
    const sourceAspect = video.videoWidth / video.videoHeight;
    const boxAspect = box.width && box.height ? box.width / box.height : sourceAspect;

    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    if (boxAspect < sourceAspect) {
      // Box is narrower than the frame: object-cover trims the sides.
      sourceWidth = Math.round(video.videoHeight * boxAspect);
    } else if (boxAspect > sourceAspect) {
      // Box is wider: object-cover trims top and bottom.
      sourceHeight = Math.round(video.videoWidth / boxAspect);
    }
    const sourceX = Math.round((video.videoWidth - sourceWidth) / 2);
    const sourceY = Math.round((video.videoHeight - sourceHeight) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraState("error");
      setCameraError("Thiết bị hiện tại không hỗ trợ chụp ảnh từ camera.");
      return;
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraState("error");
      setCameraError("Không thể lấy ảnh từ camera. Hãy thử lại.");
      return;
    }

    stopCameraStream();

    const file = new File([blob], `agromindai-capture-${Date.now()}.jpg`, {
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
    const uploadState: DiagnosisStepState =
      status === "uploading" ? "processing" : previewUrl ? "success" : "idle";
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

    const symptomState: DiagnosisStepState =
      status === "success" ? "success" : status === "symptom-review" ? "processing" : previewUrl ? "queued" : "idle";
    const resultState: DiagnosisStepState = status === "success" ? "success" : previewUrl ? "queued" : "idle";

    return [
      {
        key: "upload",
        title: tr("Tải ảnh", "Upload image"),
        description: tr("Chọn hoặc chụp một ảnh lá rõ để bắt đầu.", "Choose or capture a clear leaf photo to begin."),
        state: uploadState,
        detail: previewUrl
          ? tr("Ảnh đã sẵn sàng cho bước kiểm tra đầu vào.", "The image is ready for the input check step.")
          : tr("Ưu tiên một chiếc lá chính, đủ sáng và không bị che.", "Prefer one main leaf, well lit and unobstructed."),
      },
      {
        key: "yolo",
        title: tr("Xác nhận ảnh lá", "Confirm leaf image"),
        description: tr("Hệ thống xem ảnh bạn gửi có đúng là lá cây hay không.", "The system checks whether your image is really a plant leaf."),
        state: checkState,
        detail:
          status === "invalid-image"
            ? serviceError ?? leafAnalysis?.reason ?? tr("Ảnh này chưa đủ điều kiện để xác nhận là lá cây.", "This image does not yet qualify as a plant leaf.")
            : status === "success" || status === "symptom-review"
              ? tr(
                  `Ảnh đã được xác nhận là lá cây với độ tin cậy ${formatConfidence(
                    leafAnalysis?.confidence ?? 0,
                  )}.`,
                  `The image was confirmed as a leaf with ${formatConfidence(
                    leafAnalysis?.confidence ?? 0,
                  )} confidence.`,
                )
              : status === "scanning"
                ? tr("Đang kiểm tra nội dung ảnh...", "Checking the image content...")
                : tr("Chọn ảnh để bắt đầu.", "Choose an image to begin."),
      },
      {
        key: "roadmap",
        title: tr("Thêm triệu chứng", "Add symptoms"),
        description: tr("Mô tả dấu hiệu quan sát được hoặc bỏ qua nếu chưa rõ.", "Describe observed signs or skip if unclear."),
        state: symptomState,
        detail:
          status === "success"
            ? tr("Thông tin đã được hoàn tất và lưu vào lịch sử của bạn.", "The information is complete and saved to your history.")
            : status === "symptom-review"
              ? tr("Bạn có thể bổ sung mô tả để đối chiếu hoặc tiếp tục không cần triệu chứng.", "You can add a description to cross-check or continue without symptoms.")
              : tr("Bước này xuất hiện sau khi ảnh lá được xác nhận.", "This step appears after the leaf image is confirmed."),
      },
      {
        key: "rag",
        title: tr("Xem kết quả", "View result"),
        description: tr("Nhận gợi ý, độ tin cậy và việc nên làm tiếp theo.", "Get suggestions, confidence, and what to do next."),
        state: resultState,
        detail: status === "success"
          ? tr("Kết quả đã sẵn sàng để xem và theo dõi lại sau.", "The result is ready to view and follow up on later.")
          : tr("Hoàn tất các bước trước để xem kết quả.", "Complete the previous steps to view the result."),
      },
    ];
  }, [leafAnalysis, previewUrl, serviceError, status, tr]);

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
      setResearchError(null);
      setLeafAnalysis(null);
      setStatus("idle");
    } catch {
      setPreviewUrl(null);
      setInputMethod(null);
      setSelectedRecord(null);
      setPendingCnnReview(null);
      setSymptomText("");
      setResearchError(null);
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
    setResearchError(null);
    setServiceError(null);
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
            // Capture the crop alongside the photo so the replay filters against
            // what was declared here, not whatever is selected days later.
            addOfflineDiagnosis(activePreview, undefined, cropId);
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
                  : "Chưa nhận thấy vùng lá đủ rõ. Hãy chụp lại gần hơn, đủ sáng và tránh vật che khuất.",
            });
            setStatus("invalid-image");
            return;
          }

          // Offline is a designed path: the image is queued locally and the
          // browser-side result is kept, so fall through and save the record.
          const isOffline = error instanceof Error && error.message === "offline";
          if (!isOffline) {
            // The analysis service failed (asleep, timeout, outage). Surface it
            // instead of saving a record that never went through the model —
            // otherwise the user sees a "successful" check with no diagnosis.
            setServiceError(
              error instanceof Error && error.message
                ? error.message
                : tr(
                    "Chưa phân tích được ảnh lúc này. Vui lòng thử lại sau ít phút.",
                    "Could not analyze the image right now. Please try again in a few minutes.",
                  ),
            );
            setStatus("invalid-image");
            return;
          }
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
    setResearchError(null);

    try {
      let research: SymptomResearchResult | null = null;
      if (symptoms.trim()) {
        research = await researchSymptomsWithSources({
          symptoms,
          cnn: pendingCnnReview.cnn,
          accessToken,
          cropId,
        });
        if (!research || research.skipped) {
          throw new Error("Chưa thể hoàn tất bước đối chiếu nguồn. Vui lòng thử lại sau ít phút.");
        }
      }

      const finalRecord = applyCnnResult(pendingCnnReview.baseRecord, pendingCnnReview.cnn, symptoms, research, cropId);
      const savedRecord = await createDiagnosisRecord(accessToken, finalRecord);
      setSelectedRecord(savedRecord);
      addGeneratedRecord(savedRecord);
      setPendingCnnReview(null);
      setSymptomText("");
      setStatus("success");
      setRunCount((value) => value + 1);
    } catch (error) {
      if (symptoms.trim()) {
        setResearchError(
          error instanceof Error
            ? error.message
            : "Chưa thể đối chiếu triệu chứng với nguồn tham khảo. Vui lòng thử lại.",
        );
        setStatus("symptom-review");
        return;
      }

      setLeafAnalysis({
        isLeaf: false,
        confidence: 0.12,
        greenRatio: leafAnalysis?.greenRatio ?? 0,
        plantLikeRatio: leafAnalysis?.plantLikeRatio ?? 0,
        averageSaturation: leafAnalysis?.averageSaturation ?? 0,
        reason: "Chưa thể lưu kết quả. Hãy kiểm tra kết nối mạng, đăng nhập lại nếu cần rồi thử lại.",
      });
      setStatus("invalid-image");
    }
  }

  // Which step is on screen. Steps 3 and 4 are decided by the flow rather than
  // by navigation: `symptom-review` means a CNN result is pending the user's
  // input, and `success` means it has been finalised. Neither can be reached by
  // clicking, so the wizard can never show a result that does not exist.
  const wizardStep: WizardStepId =
    status === "success" ? "result" : status === "symptom-review" ? "symptoms" : manualStep;

  // The camera surface replaces the picker as soon as there is something to look
  // at. Showing both stacked is what made this step three screens tall.
  const showCameraSurface =
    cameraState === "live" || cameraState === "starting" || cameraState === "error" || Boolean(previewUrl);

  const contextChips = (
    <>
      <QuotaHint limitKey="daily_diagnoses" />
      <Badge variant={online ? "success" : "warning"}>
        {online ? tr("Đang online", "Online") : tr("Mất mạng", "Offline")}
      </Badge>
      {offlineCount ? (
        <Badge variant="warning">
          {tr(`${offlineCount} ảnh chờ gửi lại`, `${offlineCount} waiting to resend`)}
        </Badge>
      ) : null}
    </>
  );

  function restartCheck() {
    setStatus("idle");
    setSelectedRecord(null);
    setPendingCnnReview(null);
    setSymptomText("");
    setResearchError(null);
    setServiceError(null);
    setLeafAnalysis(null);
    setPreviewUrl(null);
    setInputMethod(null);
    setManualStep("photo");
  }

  return (
    <>
      {wizardStep === "crop" ? (
        <WizardShell
          step="crop"
          title={tr("Bạn đang kiểm tra cây gì?", "Which crop are you checking?")}
          description={tr(
            "Chọn cây trồng để kết quả chỉ hiện các bệnh của đúng loại cây đó. Bỏ qua nếu bạn chưa chắc.",
            "Pick the crop so results only cover that plant's diseases. Skip it if you are not sure.",
          )}
          aside={contextChips}
          footer={
            <Button size="lg" onClick={() => setManualStep("photo")} className="w-full sm:w-auto">
              {tr("Tiếp tục", "Continue")}
            </Button>
          }
        >
          <div className="space-y-4">
            <CropPicker value={cropId} onChange={handleCropChange} className="sm:max-w-md" />
            <p className="max-w-2xl text-sm leading-7 text-ink-soft">
              {cropId
                ? tr(
                    `Kết quả sẽ chỉ hiện các bệnh trên ${findCrop(cropId)?.name}. Nếu ảnh không giống bệnh nào của cây này, hệ thống sẽ nói rõ thay vì đoán bừa.`,
                    `Results will show only diseases of ${findCrop(cropId)?.nameEn}. If the photo matches none of them, you will be told plainly rather than given a guess.`,
                  )
                : tr(
                    "Chưa chọn thì hệ thống giữ đủ 5 khả năng từ ảnh.",
                    "Left unset, all five possibilities from the photo are kept.",
                  )}
            </p>
          </div>
        </WizardShell>
      ) : null}

      {wizardStep === "photo" ? (
        <WizardShell
          step="photo"
          title={tr("Chụp hoặc chọn một ảnh lá", "Take or choose a leaf photo")}
          description={tr(
            "Một chiếc lá, đủ sáng, chiếm phần lớn khung hình.",
            "One leaf, well lit, filling most of the frame.",
          )}
          aside={contextChips}
          footer={
            <>
              <Button variant="ghost" onClick={() => setManualStep("crop")} disabled={busy} className="w-full sm:w-auto">
                {tr("Quay lại", "Back")}
              </Button>
              <Button
                size="lg"
                loading={busy}
                disabled={busy || !previewUrl}
                onClick={() => {
                  void handleStartDiagnosis();
                }}
                className="w-full sm:w-auto"
              >
                <PlayCircle size={18} aria-hidden /> {tr("Bắt đầu kiểm tra", "Start check")}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {showCameraSurface ? (
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
            ) : (
              <UploadPanel
                busy={busy}
                cameraSupported={cameraSupported}
                onFileSelected={applySelectedFile}
                onOpenCamera={() => {
                  void openCamera();
                }}
              />
            )}

            {previewUrl && !busy ? (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setInputMethod(null);
                  setLeafAnalysis(null);
                  setStatus("idle");
                }}
                className="text-sm font-semibold text-leaf-strong underline underline-offset-4"
              >
                {tr("Chọn ảnh khác", "Choose a different photo")}
              </button>
            ) : null}

            {status === "invalid-image" ? (
              <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--sun)_45%,transparent)] bg-sun-soft p-4">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
                <div>
                  <p className="font-semibold text-ink">{tr("Ảnh chưa dùng được", "This photo cannot be used")}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {serviceError ??
                      leafAnalysis?.reason ??
                      tr(
                        "Hãy thử chụp gần hơn vào lá, tăng ánh sáng hoặc đổi sang một ảnh rõ hơn.",
                        "Try shooting closer to the leaf, adding light, or switching to a clearer image.",
                      )}
                  </p>
                </div>
              </div>
            ) : null}

            {busy ? <AIProcessStepper steps={processSteps} /> : null}
          </div>
        </WizardShell>
      ) : null}

      {wizardStep === "symptoms" ? (
        <WizardShell
          step="symptoms"
          title={tr("Bạn nhìn thấy dấu hiệu gì trên cây?", "What signs do you see on the plant?")}
          description={tr(
            "Mô tả đốm, màu sắc, vị trí trên lá hoặc thời tiết gần đây. Có thể bỏ qua.",
            "Describe spots, colours, position on the leaf, or recent weather. Skippable.",
          )}
          aside={contextChips}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  void finalizeDiagnosisWithSymptoms("");
                }}
                disabled={busy}
                className="w-full sm:w-auto"
              >
                {tr("Bỏ qua bước này", "Skip this step")}
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  void finalizeDiagnosisWithSymptoms(symptomText);
                }}
                disabled={!symptomText.trim() || busy}
                className="w-full sm:w-auto"
              >
                {tr("Xem kết quả", "See the result")}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* The five possibilities are deliberately NOT shown here. Reading
                "Cà chua · Đốm vi khuẩn 31%" before writing a description makes
                the grower describe that disease back to the system, and the
                symptom text then agrees with the model by construction. The
                predictions still travel with the request — they are just not on
                screen while the observation is being written. */}
            <div>
              <label htmlFor="symptom-text" className="text-sm font-bold text-ink">
                {tr("Mô tả triệu chứng", "Describe the symptoms")}
              </label>
              <textarea
                id="symptom-text"
                value={symptomText}
                onChange={(event) => {
                  setSymptomText(event.target.value);
                  setResearchError(null);
                }}
                rows={4}
                className="mt-2 min-h-[160px] w-full resize-none rounded-[var(--r-md)] border border-line bg-surface-soft px-4 py-3 text-base leading-7 text-ink outline-none transition placeholder:text-ink-muted focus:border-leaf focus:bg-surface focus:ring-2 focus:ring-[color-mix(in_srgb,var(--leaf)_20%,transparent)]"
                placeholder={tr(
                  "Ví dụ: lá có đốm nâu lan từ mép, mặt dưới hơi mốc trắng, cây mới mưa nhiều 3 ngày...",
                  "e.g. brown spots spreading from the edges, slight white mould underneath, heavy rain for the last 3 days...",
                )}
              />
            </div>

            {voice.supported ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (voice.listening) voice.stop();
                    else voice.start();
                  }}
                >
                  <Mic size={16} aria-hidden />
                  {voice.listening ? tr("Dừng ghi âm", "Stop recording") : tr("Nói thay vì gõ", "Speak instead of typing")}
                </Button>
                {voiceNote || voice.transcript ? (
                  <button
                    type="button"
                    onClick={() => {
                      const spoken = (voice.transcript || voiceNote).trim();
                      if (!spoken) return;
                      setSymptomText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken));
                    }}
                    className="text-sm font-semibold text-leaf-strong underline underline-offset-4"
                  >
                    {tr("Chèn lời vừa nói vào mô tả", "Insert what you said")}
                  </button>
                ) : null}
              </div>
            ) : null}

            {voice.listening || voiceNote || voice.transcript ? (
              <p className="rounded-[var(--r-md)] border border-line bg-surface-soft px-4 py-3 text-sm leading-6 text-ink-soft">
                {voice.listening
                  ? tr("Đang nghe...", "Listening...")
                  : voice.transcript || voiceNote}
              </p>
            ) : null}

            {researchError ? (
              <div className="rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-danger-soft px-4 py-3 text-sm leading-6 text-danger-ink">
                {researchError}
              </div>
            ) : null}

            <p className="text-xs leading-6 text-ink-soft">
              {tr(
                "Chỉ khi bạn mô tả triệu chứng, hệ thống mới đi tìm và tổng hợp nguồn tham khảo. Các nguồn được lưu cùng kết quả để bạn mở kiểm tra lại.",
                "Only when you describe symptoms does the system search and compile reference sources. They are saved with the result so you can open them later.",
              )}
            </p>
          </div>
        </WizardShell>
      ) : null}

      {wizardStep === "result" ? (
        <WizardShell
          step="result"
          title={tr("Kết quả kiểm tra", "Check result")}
          description={tr(
            "Kết quả là gợi ý để bạn tiếp tục quan sát, không thay thế đánh giá tại vườn.",
            "The result is a suggestion to keep observing, not a substitute for judgement in the field.",
          )}
          aside={contextChips}
          footer={
            <>
              <Button variant="ghost" onClick={restartCheck} className="w-full sm:w-auto">
                {tr("Kiểm tra ảnh khác", "Check another photo")}
              </Button>
              {selectedRecord ? (
                <Link href="/dashboard/chat" className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}>
                  <MessageSquareText size={16} aria-hidden /> {tr("Hỏi thêm", "Ask a follow-up")}
                </Link>
              ) : null}
              {selectedRecord ? (
                <Link
                  href={`/dashboard/results/${selectedRecord.id}`}
                  className={cn(buttonVariants({ variant: "primary" }), "w-full sm:w-auto")}
                >
                  {tr("Xem chi tiết", "View details")}
                </Link>
              ) : null}
            </>
          }
        >
          <div className="space-y-4">
            <DiagnosisResultCard
              record={selectedRecord}
              locked={chatLocked && status === "success"}
              onUpgrade={() => setUpgradeOpen(true)}
            />

            {leafAnalysis ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [tr("Độ tin cậy", "Confidence"), leafAnalysis.confidence],
                  [tr("Vùng lá trong ảnh", "Leaf area"), leafAnalysis.plantLikeRatio],
                  [tr("Nhận biết màu lá", "Leaf colour"), leafAnalysis.greenRatio],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-[var(--r-md)] border border-line bg-surface p-4">
                    <p className="text-overline text-leaf-strong">{label}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-ink">
                      {formatConfidence(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-line bg-surface-soft p-4">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
              <p className="text-sm leading-7 text-ink-soft">
                {tr(
                  "Nếu dấu hiệu lan nhanh, xuất hiện trên nhiều cây hoặc bạn định dùng thuốc, hãy hỏi chuyên gia nông nghiệp địa phương trước khi xử lý.",
                  "If signs spread quickly, appear on many plants, or you plan to use pesticides, consult a local agriculture expert before acting.",
                )}
              </p>
            </div>

            <AIProcessStepper steps={processSteps} />
          </div>
        </WizardShell>
      ) : null}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
