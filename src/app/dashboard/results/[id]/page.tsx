"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Bookmark, Leaf, RefreshCcw, Volume2 } from "lucide-react";

import { ActionRecommendations } from "@/components/diagnosis/action-recommendations";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { djangoClassifyLeafImage, type DjangoCnnResponse } from "@/lib/django-client";
import { diagnosisPayloadFromRecord, fetchDiagnosisRecord, updateDiagnosisRecord } from "@/lib/diagnoses-client";
import { fetchInputLibrary, type AgriculturalInput } from "@/lib/farmops-client";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";
import type { DiagnosisRecord } from "@/types";

function applyCnnResult(record: DiagnosisRecord, cnn: DjangoCnnResponse): DiagnosisRecord {
  const topItems = cnn.top_predictions.slice(0, 5).map((item) => {
    return `${item.plant_name || "Cây"} - ${item.disease_name}: ${formatConfidence(item.confidence)}`;
  });

  return {
    ...record,
    plant: cnn.plant_name || record.plant,
    disease: cnn.disease_name || cnn.class_name || record.disease,
    confidence: cnn.confidence,
    severity: cnn.disease_name?.toLowerCase().includes("healthy") ? "Khỏe" : "CNN",
    classificationReady: true,
    note: `CNN đã phân loại ảnh với độ tin cậy ${formatConfidence(cnn.confidence)}.`,
    symptomSummary:
      cnn.disease_name?.toLowerCase().includes("healthy")
        ? "CNN nhận định ảnh lá hiện tại thuộc nhóm khỏe mạnh. Bạn vẫn nên tiếp tục theo dõi nếu cây có dấu hiệu bất thường ngoài thực địa."
        : `CNN nhận định ảnh có khả năng thuộc nhóm ${cnn.disease_name || cnn.class_name}. Kết quả này nên được dùng như gợi ý hỗ trợ, không thay thế đánh giá thực địa.`,
    causes: [
      `Nhãn CNN: ${cnn.class_name}.`,
      `Độ tin cậy CNN: ${formatConfidence(cnn.confidence)}.`,
      `Model: ${cnn.model_version}.`,
    ],
    recommendations: [
      {
        title: "Kết quả CNN",
        items: topItems.length ? topItems : ["CNN đã trả về một nhãn phân loại chính cho ảnh này."],
      },
      ...record.recommendations,
    ],
    cnnConfidence: cnn.confidence,
    cnnPayload: cnn as unknown as Record<string, unknown>,
    actionPlan: cnn.action_plan,
    modelVersion: cnn.model_version,
  };
}

function getCnnConfidenceTone(item: string) {
  const match = item.match(/(\d+(?:[.,]\d+)?)%/);
  const confidence = match ? Number(match[1].replace(",", ".")) / 100 : 0;

  if (confidence >= 0.7) {
    return {
      label: "Tin cậy",
      className: "border-emerald-300/45 bg-emerald-500/12 text-emerald-50",
      badgeClassName: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40",
    };
  }

  return {
    label: "Cảnh báo",
    className: "border-red-300/45 bg-red-500/12 text-red-50",
    badgeClassName: "bg-red-400/20 text-red-100 ring-1 ring-red-300/40",
  };
}

function inputCategoryLabel(category: string) {
  if (category === "pesticide") return "Thuốc BVTV";
  if (category === "fertilizer") return "Phân bón";
  if (category === "nutrition") return "Dinh dưỡng";
  return category;
}

export default function ResultDetailPage() {
  const params = useParams<{ id: string }>();
  const { records, saveRecord, savedRecordIds, addGeneratedRecord } = useDiagnosisStore();
  const { accessToken } = useSessionStore();
  const [cnnRefreshState, setCnnRefreshState] = useState<"idle" | "loading" | "error">("idle");
  const [relatedInputs, setRelatedInputs] = useState<AgriculturalInput[]>([]);
  const [remoteRecord, setRemoteRecord] = useState<DiagnosisRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tts = useTextToSpeech("vi-VN");

  const record = useMemo(
    () => records.find((item) => item.id === params.id) ?? remoteRecord,
    [params.id, records, remoteRecord],
  );

  useEffect(() => {
    if (!accessToken || records.some((item) => item.id === params.id)) return;
    let cancelled = false;
    void fetchDiagnosisRecord(accessToken, params.id)
      .then((item) => {
        if (cancelled) return;
        setRemoteRecord(item);
        addGeneratedRecord(item);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Không tải được bản ghi chẩn đoán.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, addGeneratedRecord, params.id, records]);

  useEffect(() => {
    if (
      !record ||
      record.classificationReady ||
      !record.image.startsWith("data:")
    ) {
      return;
    }

    let cancelled = false;
    setCnnRefreshState("loading");

    void djangoClassifyLeafImage({
      imageDataUrl: record.image,
      accessToken,
      })
      .then((cnn) => {
        if (cancelled) return;
        const nextRecord = applyCnnResult(record, cnn);
        addGeneratedRecord(nextRecord);
        if (accessToken) {
          void updateDiagnosisRecord(accessToken, nextRecord.id, diagnosisPayloadFromRecord(nextRecord))
            .then((saved) => addGeneratedRecord(saved))
            .catch(() => undefined);
        }
        setCnnRefreshState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setCnnRefreshState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, addGeneratedRecord, record]);

  useEffect(() => {
    if (!record?.classificationReady) return;
    void fetchInputLibrary({ crop: record.plant, disease: record.disease })
      .then((items) => setRelatedInputs(items.slice(0, 3)))
      .catch(() => setRelatedInputs([]));
  }, [record]);

  if (!record) {
    return (
      <Card className="rounded-[34px] border-white/10 bg-white/5 py-20 text-center text-white">
        <h2 className="font-display text-3xl font-semibold">Không tìm thấy kết quả xác thực</h2>
        <p className="mt-4 text-sm leading-7 text-emerald-50/75">
          {loadError ?? "Bản ghi này không tồn tại hoặc không thuộc tài khoản hiện tại."}
        </p>
        <div className="mt-6">
          <Link href="/dashboard/history" className={buttonVariants({ variant: "secondary" })}>
            Quay về lịch sử
          </Link>
        </div>
      </Card>
    );
  }

  const classificationReady = Boolean(record.classificationReady);
  const cnnConfidenceLow = typeof record.cnnConfidence === "number" && record.cnnConfidence < 0.7;
  const cnnStatusLabel = classificationReady
    ? record.cnnConfidence !== undefined
      ? formatConfidence(record.cnnConfidence)
      : "Đã sẵn sàng"
    : cnnRefreshState === "loading"
      ? "Đang chạy"
      : cnnRefreshState === "error"
        ? "Chưa chạy được"
        : "Chưa có";
  const sourceLabel =
    record.inputMethod === "capture"
      ? "Ảnh chụp"
      : record.inputMethod === "upload"
        ? "Ảnh tải lên"
        : "Ảnh mẫu";

  return (
    <div className="space-y-6">
      <Card className="rounded-[36px] border-white/10 bg-white/5 text-white">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-3">
            <Image
              src={record.image}
              alt={record.disease}
              width={1200}
              height={900}
              unoptimized
              className="h-full min-h-[320px] w-full rounded-[24px] object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="locked">{record.plant}</Badge>
              <Badge variant="dark">{record.severity}</Badge>
              {savedRecordIds.includes(record.id) ? <Badge variant="success">Đã lưu</Badge> : null}
              <Badge variant="brand">{sourceLabel}</Badge>
            </div>
            <h2 className="mt-5 font-display text-5xl font-semibold">{record.disease}</h2>
            <p className="mt-4 text-base leading-8 text-emerald-50/75">{record.note}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Ngày tạo</p>
                <p className="mt-3 font-display text-2xl font-semibold">
                  {formatDate(record.createdAt)}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                  Độ tin cậy YOLO
                </p>
                <p className="mt-3 font-display text-2xl font-semibold text-lime-200">
                  {formatConfidence(record.leafConfidence ?? record.confidence)}
                </p>
              </div>
              <div
                className={`rounded-[24px] border p-4 ${
                  classificationReady
                    ? cnnConfidenceLow
                      ? "border-red-300/45 bg-red-500/12"
                      : "border-emerald-300/45 bg-emerald-500/12"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                  {classificationReady ? "Độ tin cậy CNN" : "Trạng thái CNN"}
                </p>
                <p className={`mt-3 font-display text-2xl font-semibold ${cnnConfidenceLow ? "text-red-100" : "text-lime-200"}`}>
                  {cnnStatusLabel}
                </p>
              </div>
            </div>

            {cnnConfidenceLow ? (
              <div className="mt-5 rounded-[24px] border border-red-300/45 bg-red-500/12 px-4 py-4 text-sm leading-7 text-red-50">
                Cảnh báo: độ tin cậy CNN dưới 70%, nên chụp lại ảnh rõ hơn hoặc hỏi chuyên gia trước khi xử lý ngoài vườn.
              </div>
            ) : null}

            {record.leafCheckNote ? (
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-emerald-50/75">
                {record.leafCheckNote}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  saveRecord(record.id);
                  if (accessToken) {
                    void updateDiagnosisRecord(accessToken, record.id, { saved_by_user: true })
                      .then((saved) => addGeneratedRecord(saved))
                      .catch(() => undefined);
                  }
                }}
              >
                <Bookmark size={16} />
                Lưu kết quả
              </Button>
              <Button
                variant="secondary"
                disabled={!tts.supported}
                onClick={() => {
                  const actionText = record.actionPlan
                    ? [
                        `Mức rủi ro ${record.actionPlan.risk_level}.`,
                        ...(record.actionPlan.immediate_actions ?? []),
                        ...(record.actionPlan.follow_up_actions ?? []),
                      ].join(" ")
                    : "";
                  tts.speak(`${record.plant}. ${record.disease}. ${record.note}. ${actionText}`);
                }}
              >
                <Volume2 size={16} />
                {tts.speaking ? "Đang đọc" : "Đọc kết quả"}
              </Button>
              <Link href="/dashboard/diagnosis" className={buttonVariants({ variant: "secondary" })}>
                <RefreshCcw size={16} />
                Xác thực ảnh khác
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <ActionRecommendations plan={record.actionPlan} />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
            <Leaf size={14} className="text-lime-200" />
            {classificationReady ? "Tóm tắt chẩn đoán" : "Tóm tắt xác thực ảnh lá"}
          </p>
          <p className="mt-5 text-base leading-8 text-emerald-50/80">{record.symptomSummary}</p>
          <div className="mt-8">
            <p className="text-sm font-semibold text-white">
              {classificationReady ? "Nguyên nhân khả thi" : "Tín hiệu YOLO sử dụng"}
            </p>
            <div className="mt-4 space-y-3">
              {record.causes.map((cause) => (
                <div
                  key={cause}
                  className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-emerald-50/75"
                >
                  {cause}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {record.recommendations.map((section) => (
            <Card
              key={section.title}
              className="rounded-[34px] border-white/10 bg-white/5 text-white"
            >
              <h3 className="font-display text-3xl font-semibold">{section.title}</h3>
              <div className="mt-5 space-y-3">
                {section.items.map((item) => {
                  const isCnnResult = section.title.includes("CNN");
                  const tone = isCnnResult ? getCnnConfidenceTone(item) : null;

                  return (
                    <div
                      key={item}
                      className={
                        tone
                          ? `flex items-start justify-between gap-3 rounded-[24px] border px-4 py-4 text-sm leading-7 ${tone.className}`
                          : "rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-emerald-50/75"
                      }
                    >
                      <span>{item}</span>
                      {tone ? (
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tone.badgeClassName}`}>
                          {tone.label}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {relatedInputs.length ? (
        <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
            Gợi ý từ thư viện vật tư
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {relatedInputs.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-100/60">
                  {inputCategoryLabel(item.category)}
                </p>
                <p className="mt-3 text-sm leading-6 text-emerald-50/75">{item.usage}</p>
                {item.warning ? <p className="mt-3 text-xs leading-5 text-amber-100">{item.warning}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
