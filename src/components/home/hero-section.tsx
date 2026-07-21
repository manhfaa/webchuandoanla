import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCheck2, Leaf, SearchCheck } from "lucide-react";

import { ActionCard } from "@/components/ui/action-card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { Reveal } from "@/components/ui/reveal";

const trustItems = [
  { icon: Leaf, label: "Kiểm tra ảnh lá" },
  { icon: SearchCheck, label: "Đối chiếu triệu chứng" },
  { icon: FileCheck2, label: "Lưu lịch sử theo dõi" },
];

export function HeroSection() {
  return (
    <section id="top" className="field-contours relative isolate overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pb-28 lg:pt-32">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <Reveal className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong shadow-sm">
            <Leaf size={14} aria-hidden />
            Trợ lý sức khỏe cây trồng cho người Việt
          </div>

          <h1 className="mt-6 font-display text-[42px] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-5xl lg:text-[64px]">
            Biết lá cây đang gặp vấn đề gì, trước khi bệnh lan rộng.
          </h1>

          <p className="mt-6 max-w-xl text-base font-medium leading-7 text-ink-soft sm:text-lg sm:leading-8">
            Tải ảnh lá để nhận gợi ý bệnh, đối chiếu triệu chứng và xem việc cần làm tiếp theo.
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

          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-line bg-surface/75 px-3 py-2.5 text-xs font-semibold text-ink-soft backdrop-blur">
                <Icon size={15} className="shrink-0 text-leaf-strong" aria-hidden />
                {label}
              </div>
            ))}
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-ink-soft">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
            Kết quả là gợi ý tham khảo có giải thích, giúp bạn quan sát cây kỹ hơn trước khi xử lý.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-8 -z-10 rounded-[48px] bg-mint/35 blur-3xl" aria-hidden />
          <SurfaceCard variant="raised" padding="lg" className="relative overflow-hidden border-surface/70 bg-surface/95">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-mint/35 blur-3xl" aria-hidden />
            <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-strong">Phiếu kiểm tra lá</p>
                <p className="mt-1 text-sm font-semibold text-ink">Vườn cà chua · Hôm nay</p>
              </div>
              <StatusBadge status="watch" label="Cần theo dõi" />
            </div>

            <div className="relative mt-5 grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl bg-forest p-4 text-on-forest">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-forest-muted">Ảnh đã kiểm tra</p>
                      <p className="mt-1 text-base font-bold">Lá cà chua</p>
                    </div>
                    <StatusBadge status="healthy" label="Ảnh hợp lệ" className="bg-on-forest/10 text-on-forest" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["leaf-sample-tomato.svg", "leaf-sample-grape.svg", "leaf-sample-corn.svg"].map((image, index) => (
                      <div key={image} className={`relative h-24 overflow-hidden rounded-xl border ${index === 0 ? "border-mint" : "border-on-forest/10 opacity-55"}`}>
                        <Image src={`/illustrations/${image}`} alt={index === 0 ? "Ảnh lá cà chua đang được kiểm tra" : "Ảnh lá tham khảo"} fill sizes="120px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface-soft p-4">
                  <p className="text-xs font-semibold text-ink-soft">Triệu chứng đã ghi nhận</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink">Đốm vàng nhỏ, mép lá khô nhẹ sau nhiều ngày ẩm.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-surface-raised p-4 shadow-sm">
                  <p className="text-xs font-semibold text-ink-soft">Khả năng cần chú ý nhất</p>
                  <p className="mt-2 font-display text-xl font-bold text-ink">Đốm vi khuẩn trên cà chua</p>
                  <ConfidenceMeter score={0.84} className="mt-4" />
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-soft px-3 py-2.5 text-xs font-medium text-ink-soft">
                    <SearchCheck size={16} className="shrink-0 text-leaf-strong" aria-hidden />
                    Triệu chứng phù hợp với nguồn tham khảo đã tìm thấy
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-soft">Việc nên làm tiếp theo</p>
                  <ActionCard title="Tách lá có đốm và chụp lại sau 3 ngày" priority="high" time="Nên thực hiện hôm nay" />
                </div>
              </div>
            </div>
          </SurfaceCard>
        </Reveal>
      </div>
    </section>
  );
}
