import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, ScanSearch, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { brand } from "@/constants/brand";
import { buttonVariants } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section
      id="top"
      className="overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-36"
    >
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <Reveal className="max-w-2xl">
          <div className="inline-flex rounded-full border border-brand-100 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-800 shadow-soft">
            Kiểm tra ảnh lá cây dễ hiểu và dễ dùng
          </div>
          <h1 className="mt-7 font-display text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
            Tải ảnh lá cây lên và nhận kết quả nhanh trong một giao diện dễ dùng.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            {brand.description} {brand.slogan}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/login" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Bắt đầu ngay
              <ArrowRight size={18} />
            </Link>
            <a href="#tinh-nang" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Xem tính năng
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Bước 1", value: "Tải ảnh hoặc chụp ảnh" },
              { label: "Bước 2", value: "Kiểm tra xem có phải lá cây" },
              { label: "Bước 3", value: "Lưu kết quả và hỏi tiếp" },
            ].map((item) => (
              <Card key={item.label} className="rounded-[24px] p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 font-display text-lg font-semibold text-ink">{item.value}</p>
              </Card>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="absolute inset-0 -z-10 rounded-[48px] bg-gradient-to-br from-brand-200/50 via-transparent to-lime-100/60 blur-3xl" />
          <Card className="relative overflow-hidden rounded-[36px] border-white/70 bg-white/80 p-4 sm:p-6">
            <div className="absolute left-6 top-6 flex gap-2">
              <span className="h-3 w-3 rounded-full bg-red-300" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-300" />
            </div>

            <div className="grid gap-4 pt-8 sm:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[30px] bg-gradient-to-br from-[#0f221a] via-[#143324] to-[#10211a] p-5 text-white shadow-float">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-emerald-50/50">
                      Ảnh đầu vào
                    </p>
                    <p className="mt-2 font-display text-2xl font-semibold">Agromind Lens</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <ScanSearch size={22} className="text-lime-200" />
                  </div>
                </div>
                <div className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <Image
                    src="/illustrations/hero-dashboard.svg"
                    alt="Minh họa giao diện Agromind AI"
                    width={560}
                    height={460}
                    className="w-full rounded-[22px]"
                  />
                  <div className="absolute right-5 top-5 rounded-full bg-brand-400 px-3 py-1 text-xs font-semibold text-emerald-950">
                    Ảnh hợp lệ
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Card className="rounded-[30px] bg-gradient-to-br from-white to-emerald-50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-brand-700">
                      <Camera size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Xem trước ảnh</p>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        Kiểm tra ảnh trước khi bắt đầu
                      </h3>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[26px] border border-emerald-100 bg-white p-3">
                    <Image
                      src="/illustrations/scan-panel.svg"
                      alt="Khung xem trước ảnh"
                      width={360}
                      height={240}
                      className="w-full rounded-[20px]"
                    />
                  </div>
                </Card>

                <Card glow className="rounded-[30px] bg-ink text-white">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-brand-500/20 p-3 text-lime-200">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-emerald-100/60">
                        Dễ sử dụng
                      </p>
                      <p className="mt-2 font-display text-2xl font-semibold">
                        Agromind AI được thiết kế để người dùng phổ thông vẫn có thể thao tác dễ dàng.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
