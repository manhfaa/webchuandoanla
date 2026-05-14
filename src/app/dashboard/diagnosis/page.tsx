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
import { mockDiagnoses } from "@/data/mock/diagnoses";
import { createPreviewDataUrl, detectLeafInImage, type LeafDetectionResult } from "@/lib/leaf-detector";
import { formatConfidence } from "@/lib/utils";
import {
  CameraPreviewState,
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

function buildGeneratedRecord({
  template,
  previewUrl,
  detection,
  inputMethod,
}: {
  template: DiagnosisRecord;
  previewUrl: string;
  detection: LeafDetectionResult;
  inputMethod: DiagnosisInputMethod;
}): DiagnosisRecord {
  return {
    id: `user-${Date.now()}`,
    plant: inputMethod === "sample" ? template.plant : "Chưa xác định loại cây",
    disease: "Ảnh lá đã được xác nhận",
    confidence: detection.confidence,
    severity: "Đã kiểm tra",
    classificationReady: false,
    image: previewUrl,
    createdAt: new Date().toISOString(),
    note:
      inputMethod === "sample"
        ? `Hệ thống đã xác nhận ${inputMethodLabelMap[inputMethod]} là ảnh lá hợp lệ.`
        : `Hệ thống đã xác nhận ${inputMethodLabelMap[inputMethod]} là ảnh lá hợp lệ.`,
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

export default function DashboardDiagnosisPage() {
  const { user } = useSessionStore();
  const { addGeneratedRecord } = useDiagnosisStore();
  const [status, setStatus] = useState<DiagnosisStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);
  const [leafAnalysis, setLeafAnalysis] = useState<LeafDetectionResult | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<DiagnosisInputMethod | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraState, setCameraState] = useState<CameraPreviewState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentPlan = user?.currentPlan ?? "free";
  const busy = status === "uploading" || status === "scanning";
  const chatLocked = currentPlan === "free";

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
          : status === "success"
            ? "success"
            : previewUrl
              ? "queued"
              : "idle";

    const saveState: DiagnosisStepState = status === "success" || previewUrl ? "queued" : "idle";

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
            : status === "success"
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
      const nextUrl = await createPreviewDataUrl(file);
      setPreviewUrl(nextUrl);
      setInputMethod(method);
      setSelectedTemplateId(null);
      setSelectedRecord(null);
      setLeafAnalysis(null);
      setStatus("idle");
    } catch {
      setPreviewUrl(null);
      setInputMethod(null);
      setSelectedRecord(null);
      setLeafAnalysis(null);
      setStatus("invalid-image");
    }
  }

  function loadSampleRecord() {
    stopCameraStream();
    const template = mockDiagnoses[runCount % mockDiagnoses.length];
    setPreviewUrl(template.image);
    setInputMethod("sample");
    setSelectedTemplateId(template.id);
    setSelectedRecord(null);
    setLeafAnalysis(null);
    setStatus("idle");
  }

  async function handleStartDiagnosis() {
    const fallbackTemplate = mockDiagnoses[runCount % mockDiagnoses.length];
    const activePreview = previewUrl ?? fallbackTemplate.image;
    const activeMethod = inputMethod ?? "sample";
    const template = mockDiagnoses.find((item) => item.id === selectedTemplateId) ?? fallbackTemplate;

    if (!previewUrl) {
      setPreviewUrl(fallbackTemplate.image);
      setInputMethod("sample");
      setSelectedTemplateId(fallbackTemplate.id);
    }

    setStatus("uploading");
    setSelectedRecord(null);
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

      const generatedRecord = buildGeneratedRecord({
        template,
        previewUrl: activePreview,
        detection,
        inputMethod: activeMethod,
      });

      setSelectedRecord(generatedRecord);
      addGeneratedRecord(generatedRecord);
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
          onUseSample={loadSampleRecord}
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
        <Button
          variant="secondary"
          onClick={() => {
            stopCameraStream();
            setPreviewUrl("/illustrations/non-leaf-sample.svg");
            setInputMethod("sample");
            setSelectedTemplateId(null);
            setSelectedRecord(null);
            setLeafAnalysis(null);
            setStatus("idle");
          }}
        >
          Dùng ảnh không phải lá
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
