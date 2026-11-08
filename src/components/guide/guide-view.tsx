"use client";

import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: ["Chọn một chiếc lá chính", "Choose one main leaf"],
    body: [
      "Đặt lá cần kiểm tra ở giữa khung hình, để thấy cả phần lá có dấu hiệu và vùng xung quanh. Tránh để nhiều cây, bàn tay hoặc vật khác che mất lá.",
      "Centre the leaf you want to check. Include both the affected area and the surrounding leaf. Keep other plants, hands and objects from blocking it.",
    ],
  },
  {
    title: ["Chụp đủ sáng, lấy nét rõ", "Use clear light and focus"],
    body: [
      "Chụp gần vừa đủ để thấy đốm, mốc hoặc biến màu, nhưng đừng cắt mất toàn bộ hình lá. Tránh ngược sáng, rung tay và ảnh mờ; nếu cần, chụp thêm mặt dưới lá.",
      "Get close enough to show spots, mould or colour changes without cutting off the whole leaf. Avoid backlight, camera shake and blur; take another photo of the underside when useful.",
    ],
  },
  {
    title: ["Mô tả điều ảnh không nói hết", "Add what the photo cannot show"],
    body: [
      "Khi kiểm tra, bạn có thể ghi màu và vị trí vết bệnh, thời điểm phát hiện, mưa hoặc độ ẩm gần đây. Phần mô tả là tùy chọn, nhưng giúp đối chiếu với quan sát ngoài vườn.",
      "You can add the colour and location of a mark, when it appeared, and recent rain or humidity. Notes are optional, but help you compare the photo with what you see in the field.",
    ],
  },
  {
    title: ["Đọc nhiều khả năng, không chỉ một tên bệnh", "Read the possibilities, not just one label"],
    body: [
      "Agromind AI hiển thị các khả năng được xếp hạng cùng mức độ tin cậy. Điểm tin cậy của mô hình không phải xác suất cây chắc chắn mắc bệnh; ảnh mờ hoặc cây ngoài phạm vi hỗ trợ có thể làm kết quả kém phù hợp.",
      "Agromind AI ranks possible results with confidence scores. A model score is not a guarantee that the plant has that disease; blurry images and unsupported crops can make a result less useful.",
    ],
  },
  {
    title: ["Chụp lại và so sánh theo thời gian", "Retake and compare over time"],
    body: [
      "Lưu kết quả, ghi nhận khu vực trồng và chụp lại cùng lá hoặc cùng vị trí sau vài ngày. Quan sát vết bệnh có lan rộng hay cây có thêm dấu hiệu mới không trước khi quyết định xử lý.",
      "Save the result, note the growing area and photograph the same leaf or spot again after a few days. Look for spreading or new signs before deciding what to do.",
    ],
  },
] as const;

export function GuideView() {
  const tr = useTr();

  return (
    <main id="main-content" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-leaf-strong">
          {tr("Hướng dẫn sử dụng", "How to use Agromind AI")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-4xl">
          {tr("Cách chụp ảnh lá cây và đọc kết quả AI", "How to photograph a leaf and read the AI result")}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink-soft">
          {tr(
            "Một ảnh lá rõ giúp Agromind AI kiểm tra đầu vào tốt hơn. Kết quả là gợi ý để bạn quan sát và theo dõi, không thay thế kiểm tra trực tiếp tại vườn.",
            "A clear leaf photo helps Agromind AI assess its input. The result is a guide for observation and follow-up, not a substitute for checking the plant in person.",
          )}
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title[0]} className="rounded-[var(--r-lg)] border border-line bg-surface-raised p-5 sm:p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-sm font-bold tabular-nums text-leaf-strong">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-4 font-display text-lg font-bold text-ink">{tr(step.title[0], step.title[1])}</h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">{tr(step.body[0], step.body[1])}</p>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-[var(--r-lg)] border border-line bg-surface-soft p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">
            {tr("Nếu hệ thống báo ảnh chưa đạt", "If the photo is not accepted")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {tr(
              "Hãy chụp lại gần lá hơn, tăng ánh sáng và tránh vật che khuất. Một ảnh chụp rõ của chiếc lá chính hữu ích hơn nhiều ảnh có phông nền rối. Bạn có thể tải ảnh từ thiết bị hoặc chụp trực tiếp bằng camera nếu thiết bị hỗ trợ.",
              "Move closer, improve the lighting and remove anything blocking the leaf. One clear photo of the main leaf is more useful than several with a cluttered background. Upload an existing image or use your camera if your device supports it.",
            )}
          </p>
        </section>

        <section className="mt-4 flex items-start gap-3 rounded-[var(--r-lg)] border border-[color-mix(in_srgb,var(--sun)_45%,transparent)] bg-sun-soft p-6">
          <ShieldAlert size={20} className="mt-1 shrink-0 text-warning-ink" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              {tr("Khi nào cần hỏi người có chuyên môn?", "When should you ask a local expert?")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              {tr(
                "Nếu dấu hiệu lan nhanh, xuất hiện trên nhiều cây, kết quả AI có độ tin cậy thấp hoặc bạn định dùng thuốc, hãy hỏi cán bộ kỹ thuật nông nghiệp tại địa phương. Đừng dùng kết quả ảnh làm căn cứ duy nhất để phun thuốc.",
                "If signs spread quickly, affect several plants, the AI score is low, or you plan to spray, ask a local agriculture technician. Do not base a pesticide decision on an image result alone.",
              )}
            </p>
          </div>
        </section>

        <nav aria-label={tr("Các bước tiếp theo", "Next steps")} className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className={cn(buttonVariants({ variant: "primary" }), "min-h-11")}>
            <Camera size={18} aria-hidden /> {tr("Kiểm tra ảnh lá", "Check a leaf photo")}
          </Link>
          <Link href="/benh-cay" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-md)] border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:text-leaf-strong">
            <CheckCircle2 size={18} aria-hidden /> {tr("Xem cây và bệnh được hỗ trợ", "See supported crops and diseases")}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </nav>
      </div>
    </main>
  );
}
