import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  Leaf,
  ScanLine,
  SearchCheck,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { Reveal } from "@/components/ui/reveal";

const trustItems = [
  "Kiểm tra ảnh trước khi phân tích",
  "Hiển thị mức độ tin cậy",
  "Lưu kết quả để theo dõi",
];

export function HeroSection() {
  return (
    <section
      id="top"
      className="field-contours relative isolate overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-14 lg:pt-28"
    >
      <div className="pointer-events-none absolute left-[8%] top-28 -z-10 h-28 w-28 rounded-full border border-leaf/10" aria-hidden />
      <div className="pointer-events-none absolute left-[11%] top-36 -z-10 h-14 w-14 rounded-full border border-leaf/15" aria-hidden />

      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10 xl:gap-16">
        <Reveal className="min-w-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-surface/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-leaf-strong shadow-sm backdrop-blur">
            <Leaf size={14} aria-hidden />
            Agromind AI · Trợ lý sức khỏe cây trồng
          </div>

          <h1 className="mt-6 max-w-[680px] font-display text-[40px] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-5xl lg:text-[54px] xl:text-[58px]">
            Nhìn rõ dấu hiệu trên lá, hành động trước khi bệnh lan rộng.
          </h1>

          <p className="mt-6 max-w-xl text-base font-medium leading-7 text-ink-soft sm:text-lg sm:leading-8">
            Tải một ảnh lá rõ để nhận gợi ý bệnh, đối chiếu triệu chứng quan sát được và xem việc nên làm tiếp theo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/login?next=/dashboard/diagnosis" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Kiểm tra ảnh lá
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#quy-trinh" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Xem cách hoạt động
            </a>
          </div>

          <ul className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2" aria-label="Điểm nổi bật">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-leaf-strong">
                  <Check size={12} strokeWidth={2.5} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-5 flex max-w-xl items-start gap-2 text-xs leading-5 text-ink-soft">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
            Kết quả là gợi ý tham khảo có giải thích, giúp bạn quan sát cây kỹ hơn trước khi xử lý.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="relative mx-auto min-w-0 w-full max-w-[720px]">
          <div className="absolute -inset-7 -z-10 rounded-[44px] bg-mint/30 blur-3xl" aria-hidden />
          <div className="absolute -right-6 top-12 -z-10 hidden h-32 w-32 rounded-full bg-sun/15 blur-2xl sm:block" aria-hidden />

          <SurfaceCard
            variant="raised"
            padding="none"
            className="relative min-w-0 overflow-hidden rounded-2xl border-surface/70 bg-surface/95 shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest text-on-forest">
                  <ScanLine size={19} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-leaf-strong">Bản xem trước kết quả</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-ink">Phiếu kiểm tra lá · Hôm nay</p>
                </div>
              </div>
              <StatusBadge status="neutral" label="Ví dụ giao diện" />
            </div>

            <div className="grid min-w-0 gap-0 min-[1180px]:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="relative min-h-[270px] overflow-hidden bg-forest min-[1180px]:min-h-[430px]">
                <Image
                  src="/plant-leaves/blueberry.jpg"
                  alt="Ảnh lá dùng để minh họa bước kiểm tra"
                  fill
                  priority
                  sizes="(min-width: 1180px) 320px, (min-width: 1024px) 56vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/5 to-transparent" aria-hidden />
                <div className="absolute inset-5 rounded-xl border border-on-forest/55" aria-hidden>
                  <span className="absolute -left-px -top-px h-8 w-8 border-l-2 border-t-2 border-mint" />
                  <span className="absolute -right-px -top-px h-8 w-8 border-r-2 border-t-2 border-mint" />
                  <span className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-mint" />
                  <span className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-mint" />
                </div>
                <div className="absolute left-4 top-4 rounded-full border border-on-forest/15 bg-forest/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-forest backdrop-blur">
                  Ảnh đầu vào
                </div>
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-on-forest/15 bg-forest/85 p-3 text-on-forest backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-forest-muted">Vùng lá</p>
                      <p className="mt-1 text-sm font-bold">Đã xác nhận</p>
                    </div>
                    <StatusBadge status="healthy" label="Ảnh hợp lệ" className="bg-on-forest/10 text-on-forest" />
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-4 bg-surface-raised p-5 sm:p-6">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-leaf-strong">Khả năng được ưu tiên</p>
                    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[10px] font-bold text-leaf-strong">Top 1 / 5</span>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-2xl">
                    Đốm lá trên việt quất
                  </h2>
                  <ConfidenceMeter score={0.84} className="mt-4" />
                </div>

                <div className="rounded-xl border border-line bg-surface-soft p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">Triệu chứng quan sát</p>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-ink">Đốm nâu nhỏ xuất hiện rải rác trên bề mặt lá.</p>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-info/20 bg-info/10 p-3.5">
                  <SearchCheck size={18} className="mt-0.5 shrink-0 text-info" aria-hidden />
                  <div>
                    <p className="text-xs font-bold text-ink">Đã đối chiếu mô tả</p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">Nguồn tham khảo liên quan được mở để bạn tự xem lại.</p>
                  </div>
                </div>

                <div className="rounded-xl bg-forest p-4 text-on-forest">
                  <div className="flex items-start gap-3">
                    <FileCheck2 size={18} className="mt-0.5 shrink-0 text-on-forest" aria-hidden />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-forest-muted">Việc nên làm tiếp</p>
                      <p className="mt-1.5 text-sm font-bold leading-6">Theo dõi vùng đốm và chụp lại sau 3 ngày.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-5 py-3 text-[11px] font-semibold text-ink-soft sm:px-6">
              <span>Ảnh lá → Phân tích → Đối chiếu → Theo dõi</span>
              <span className="text-leaf-strong">Một luồng, một kết quả dễ hiểu</span>
            </div>
          </SurfaceCard>
        </Reveal>
      </div>
    </section>
  );
}
