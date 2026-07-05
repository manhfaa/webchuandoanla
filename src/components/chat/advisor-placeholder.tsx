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
              Chat theo kết quả kiểm tra
            </p>
            <h3 className="mt-2 font-display text-3xl font-semibold">
              Cần có kết quả phân tích ảnh trước khi tư vấn theo ca
            </h3>
            <p className="mt-3 text-sm leading-7 text-emerald-50/75">
              Chat này sẽ dùng kết quả phân tích ảnh để hỗ trợ đánh giá tình trạng, gợi ý bước chăm sóc và theo dõi. Khi chưa có kết quả ảnh, Agromind AI sẽ không tự đưa ra kết luận bệnh.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Đánh giá tình trạng theo cây, bệnh nghi ngờ và độ tin cậy của kết quả.",
            "Đề xuất bước chăm sóc ưu tiên theo thứ tự dễ kiểm tra lại.",
            "Gợi ý cách theo dõi tiếp theo để người dùng ghi nhận diễn biến của cây.",
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
                  ? "Kết quả phân tích ảnh đã sẵn sàng cho bước tư vấn tiếp theo."
                  : "Hiện chưa có kết quả phân tích ảnh nên chat này đang ở trạng thái chờ."}
              </p>
              <p className="mt-2">(AI có thể mắc lỗi vui lòng kiểm tra lại)</p>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-emerald-50/75">
          <div className="flex items-center gap-2 text-lime-200">
            <ShieldCheck size={16} />
            Gợi ý sử dụng
          </div>
          <p className="mt-2">
            Bạn có thể chuyển sang tab chuyên gia nông nghiệp để hỏi các vấn đề chăm sóc cây tổng quát, không cần chọn ca kiểm tra ảnh.
          </p>
        </div>
      </div>
    </Card>
  );
}
