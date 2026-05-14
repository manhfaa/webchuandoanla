"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Bookmark, Leaf, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockDiagnoses } from "@/data/mock/diagnoses";
import { formatConfidence, formatDate } from "@/lib/utils";
import { useDiagnosisStore } from "@/store/diagnosis-store";

export default function ResultDetailPage() {
  const params = useParams<{ id: string }>();
  const { records, saveRecord, savedRecordIds } = useDiagnosisStore();

  const record = useMemo(
    () =>
      records.find((item) => item.id === params.id) ??
      mockDiagnoses.find((item) => item.id === params.id) ??
      null,
    [params.id, records],
  );

  if (!record) {
    return (
      <Card className="rounded-[34px] border-white/10 bg-white/5 py-20 text-center text-white">
        <h2 className="font-display text-3xl font-semibold">Không tìm thấy kết quả xác thực</h2>
        <p className="mt-4 text-sm leading-7 text-emerald-50/75">
          Bản ghi bạn đang tìm có thể chưa được tạo trong phiên demo hiện tại.
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
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                  Trạng thái CNN
                </p>
                <p className="mt-3 font-display text-2xl font-semibold">
                  {classificationReady ? "Đã sẵn sàng" : "Sẽ bổ sung sau"}
                </p>
              </div>
            </div>

            {record.leafCheckNote ? (
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-emerald-50/75">
                {record.leafCheckNote}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => saveRecord(record.id)}>
                <Bookmark size={16} />
                Lưu kết quả
              </Button>
              <Link href="/dashboard/diagnosis" className={buttonVariants({ variant: "secondary" })}>
                <RefreshCcw size={16} />
                Xác thực ảnh khác
              </Link>
            </div>
          </div>
        </div>
      </Card>

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
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-emerald-50/75"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
