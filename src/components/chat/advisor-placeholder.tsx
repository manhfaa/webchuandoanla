"use client";

import { AlertTriangle, Bot, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

export function AdvisorPlaceholder({
  hasCnnResult,
}: {
  hasCnnResult: boolean;
}) {
  return (
    <Card className="rounded-[34px] border-white/10 bg-white/5 text-white">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/10 p-3 text-lime-200">
            <Bot size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              AI điều trị
            </p>
            <h3 className="mt-2 font-display text-3xl font-semibold">
              Luồng prompt chặt chẽ đang chờ kết quả CNN
            </h3>
            <p className="mt-3 text-sm leading-7 text-emerald-50/75">
              Chat này sẽ dùng kết quả CNN để tạo prompt chặt chẽ cho phần đánh giá, giải pháp và
              điều trị. Khi chưa có CNN, Agromind AI sẽ không giả lập trả lời để tránh gây hiểu nhầm.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Đánh giá tình trạng theo đúng cây, bệnh và độ tin cậy từ CNN.",
            "Đề xuất giải pháp ưu tiên theo cấu trúc chặt chẽ, dễ kiểm tra lại.",
            "Sinh hướng điều trị và theo dõi có định dạng nhất quán cho UI thương mại.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-emerald-50/75"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="rounded-[26px] border border-amber-200/50 bg-amber-50/10 px-5 py-4 text-sm leading-7 text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-1 text-amber-200" />
            <div>
              <p className="font-semibold text-amber-50">
                {hasCnnResult
                  ? "Kết quả CNN đã sẵn sàng cho bước tiếp theo."
                  : "Hiện chưa có kết quả CNN nên chat này đang ở trạng thái chờ."}
              </p>
              <p className="mt-2">(AI có thể mắc lỗi vui lòng kiểm tra lại)</p>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-emerald-50/75">
          <div className="flex items-center gap-2 text-lime-200">
            <ShieldCheck size={16} />
            Gợi ý UX
          </div>
          <p className="mt-2">
            Trong giai đoạn hiện tại, người dùng có thể chuyển sang tab chuyên gia nông nghiệp để
            nhận câu trả lời dựa trên bộ tri thức Light RAG.
          </p>
        </div>
      </div>
    </Card>
  );
}
