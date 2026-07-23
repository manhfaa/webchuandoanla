"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Bookmark, Leaf, RefreshCcw, Volume2 } from "lucide-react";

import { ActionRecommendations } from "@/components/diagnosis/action-recommendations";
import { DiagnosisResultCard } from "@/components/diagnosis/result-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { djangoClassifyLeafImage, type DjangoCnnResponse } from "@/lib/django-client";
import { diagnosisPayloadFromRecord, fetchDiagnosisRecord, updateDiagnosisRecord } from "@/lib/diagnoses-client";
import { fetchInputLibrary, type AgriculturalInput } from "@/lib/farmops-client";
import { toUserFacingText } from "@/lib/user-facing-copy";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";
import { useSessionStore } from "@/store/session-store";
import type { DiagnosisRecord } from "@/types";

function applyClassificationResult(record: DiagnosisRecord, result: DjangoCnnResponse): DiagnosisRecord {
  const topItems = result.top_predictions.slice(0, 5).map((item) => `${item.plant_name || "Cây"} - ${item.disease_name}: ${formatConfidence(item.confidence)}`);
  const healthy = result.disease_name?.toLowerCase().includes("healthy");

  return {
    ...record,
    plant: result.plant_name || record.plant,
    disease: result.disease_name || result.class_name || record.disease,
    confidence: result.confidence,
    severity: healthy ? "Khỏe" : "Cần theo dõi",
    classificationReady: true,
    note: `Ảnh đã được phân tích với độ tin cậy ${formatConfidence(result.confidence)}.`,
    symptomSummary: healthy
      ? "Ảnh lá hiện tại được xếp vào nhóm khỏe mạnh. Bạn vẫn nên tiếp tục theo dõi nếu cây có dấu hiệu bất thường ngoài thực địa."
      : `Ảnh có khả năng thuộc nhóm ${result.disease_name || result.class_name}. Đây là gợi ý hỗ trợ, không thay thế đánh giá trực tiếp tại vườn.`,
    causes: [`Khả năng được chọn: ${result.class_name}.`, `Độ tin cậy: ${formatConfidence(result.confidence)}.`],
    recommendations: [{ title: "Các khả năng khác từ ảnh", items: topItems.length ? topItems : ["Hệ thống đã trả về một khả năng chính cho ảnh này."] }, ...record.recommendations],
    cnnConfidence: result.confidence,
    cnnPayload: result as unknown as Record<string, unknown>,
    actionPlan: result.action_plan,
    modelVersion: result.model_version,
  };
}

function inputCategoryLabel(category: string) {
  if (category === "pesticide") return "Thuốc bảo vệ thực vật";
  if (category === "fertilizer") return "Phân bón";
  if (category === "nutrition") return "Dinh dưỡng";
  return category;
}

export default function ResultDetailPage() {
  const params = useParams<{ id: string }>();
  const { records, saveRecord, savedRecordIds, addGeneratedRecord } = useDiagnosisStore();
  const { accessToken } = useSessionStore();
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "error">("idle");
  const [relatedInputs, setRelatedInputs] = useState<AgriculturalInput[]>([]);
  const [remoteRecord, setRemoteRecord] = useState<DiagnosisRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tts = useTextToSpeech("vi-VN");

  const record = useMemo(() => records.find((item) => item.id === params.id) ?? remoteRecord, [params.id, records, remoteRecord]);

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
      .catch((requestError) => {
        if (!cancelled) setLoadError(requestError instanceof Error ? requestError.message : "Không tải được kết quả kiểm tra.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, addGeneratedRecord, params.id, records]);

  useEffect(() => {
    if (!record || record.classificationReady || !record.image.startsWith("data:")) return;
    let cancelled = false;
    setRefreshState("loading");
    void djangoClassifyLeafImage({ imageDataUrl: record.image, accessToken })
      .then((result) => {
        if (cancelled) return;
        const nextRecord = applyClassificationResult(record, result);
        addGeneratedRecord(nextRecord);
        if (accessToken) {
          void updateDiagnosisRecord(accessToken, nextRecord.id, diagnosisPayloadFromRecord(nextRecord)).then((saved) => addGeneratedRecord(saved)).catch(() => undefined);
        }
        setRefreshState("idle");
      })
      .catch(() => {
        if (!cancelled) setRefreshState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, addGeneratedRecord, record]);

  useEffect(() => {
    if (!record?.classificationReady) return;
    void fetchInputLibrary({ crop: record.plant, disease: record.disease }).then((items) => setRelatedInputs(items.slice(0, 3))).catch(() => setRelatedInputs([]));
  }, [record]);

  if (!record && accessToken && !loadError) {
    return <LoadingState title="Đang mở kết quả kiểm tra" description="Agromind AI đang lấy ảnh và thông tin đã lưu của bạn." />;
  }

  if (!record) {
    return <ErrorState title="Không tìm thấy kết quả" description={loadError ?? "Kết quả này không tồn tại hoặc không thuộc tài khoản hiện tại."} action={<Link href="/dashboard/history" className={buttonVariants({ variant: "secondary", size: "md" })}>Quay về lịch sử</Link>} />;
  }

  const confidence = record.cnnConfidence ?? record.confidence ?? 0;
  const lowConfidence = confidence < 0.7;
  const sourceLabel = record.inputMethod === "capture" ? "Ảnh chụp" : record.inputMethod === "upload" ? "Ảnh tải lên" : "Ảnh đã chọn";

  return (
    <div className="fl-stagger mx-auto max-w-[1320px] space-y-6">
      <Card variant="raised" padding="lg" className="rounded-xl">
        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-line bg-surface-soft sm:min-h-[430px]">
            <Image src={record.image} alt={`Ảnh lá ${record.plant}`} fill sizes="(max-width: 1280px) 100vw, 520px" unoptimized className="object-cover" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2"><Badge className="bg-surface/90 text-ink shadow-sm">{record.plant || "Chưa xác định cây"}</Badge><Badge className="bg-surface/90 text-ink shadow-sm">{sourceLabel}</Badge></div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={lowConfidence ? "watch" : "healthy"} label={lowConfidence ? "Cần theo dõi" : "Tin cậy cao"} />
              {savedRecordIds.includes(record.id) ? <Badge variant="muted">Đã lưu</Badge> : null}
              {refreshState === "loading" ? <StatusBadge status="processing" label="Đang hoàn thiện kết quả" /> : null}
            </div>
            <p className="mt-6 text-overline text-leaf-strong">Kết luận chính</p>
            <h2 className="mt-2 font-display text-[34px] font-bold leading-[1.14] tracking-[-0.04em] text-ink sm:text-[44px]">{record.disease || "Chưa có gợi ý bệnh"}</h2>
            <p className="mt-4 text-base leading-8 text-ink-soft">{toUserFacingText(record.note, "Mở phần thông tin bên dưới để xem chi tiết kết quả.")}</p>

            <ConfidenceMeter score={confidence} className="mt-6 max-w-xl" />

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg bg-surface-soft p-4 sm:grid-cols-3">
              <div><p className="text-xs font-medium text-ink-soft">Ngày kiểm tra</p><p className="mt-1 text-sm font-bold text-ink">{formatDate(record.createdAt)}</p></div>
              <div><p className="text-xs font-medium text-ink-soft">Chất lượng ảnh</p><p className="mt-1 text-sm font-bold text-ink">{formatConfidence(record.leafConfidence ?? record.confidence)}</p></div>
              <div className="col-span-2 sm:col-span-1"><p className="text-xs font-medium text-ink-soft">Trạng thái</p><p className="mt-1 text-sm font-bold text-ink">{record.classificationReady ? "Đã có gợi ý" : refreshState === "error" ? "Cần thử lại" : "Đang xử lý"}</p></div>
            </div>

            {lowConfidence ? <div className="mt-4 rounded-lg border border-sun/35 bg-sun-soft px-4 py-3 text-sm leading-7 text-ink">Độ tin cậy dưới 70%. Nên chụp thêm ảnh rõ hơn hoặc hỏi chuyên gia trước khi xử lý ngoài vườn.</div> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => {
                saveRecord(record.id);
                if (accessToken) void updateDiagnosisRecord(accessToken, record.id, { saved_by_user: true }).then((saved) => addGeneratedRecord(saved)).catch(() => undefined);
              }}><Bookmark size={16} aria-hidden /> Lưu kết quả</Button>
              <Button variant="secondary" disabled={!tts.supported} onClick={() => {
                const actionText = record.actionPlan ? [...(record.actionPlan.immediate_actions ?? []), ...(record.actionPlan.follow_up_actions ?? [])].join(" ") : "";
                tts.speak(`${record.plant}. ${record.disease}. ${toUserFacingText(record.note)}. ${actionText}`);
              }}><Volume2 size={16} aria-hidden /> {tts.speaking ? "Đang đọc" : "Đọc kết quả"}</Button>
              <Link href="/dashboard/diagnosis" className={buttonVariants({ variant: "secondary" })}><RefreshCcw size={16} aria-hidden /> Kiểm tra ảnh khác</Link>
            </div>
          </div>
        </div>
      </Card>

      <ActionRecommendations plan={record.actionPlan} />
      <DiagnosisResultCard record={record} detailsOnly />

      {record.causes.length ? (
        <Card variant="default" padding="lg" className="rounded-xl">
          <p className="flex items-center gap-2 text-overline text-leaf-strong"><Leaf size={14} aria-hidden /> Vì sao có gợi ý này</p>
          <h3 className="mt-2 text-h2 font-bold text-ink">Các thông tin hỗ trợ kết luận</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {record.causes.map((cause) => <div key={cause} className="rounded-lg border border-line bg-surface-soft px-4 py-4 text-sm leading-7 text-ink-soft">{toUserFacingText(cause)}</div>)}
          </div>
        </Card>
      ) : null}

      {relatedInputs.length ? (
        <Card variant="soft" padding="lg" className="rounded-xl">
          <p className="text-overline text-leaf-strong">Thư viện vật tư</p>
          <h3 className="mt-2 text-h2 font-bold text-ink">Thông tin có thể liên quan</h3>
          <p className="mt-2 text-sm leading-7 text-ink-soft">Đọc kỹ hướng dẫn và hỏi người có chuyên môn trước khi sử dụng bất kỳ sản phẩm nào.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {relatedInputs.map((item) => <div key={item.id} className="rounded-lg border border-line bg-surface p-4"><p className="text-sm font-bold text-ink">{item.name}</p><p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-leaf-strong">{inputCategoryLabel(item.category)}</p><p className="mt-3 text-sm leading-6 text-ink-soft">{item.usage}</p>{item.warning ? <p className="mt-3 text-xs leading-6 text-warning-ink">{item.warning}</p> : null}</div>)}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
