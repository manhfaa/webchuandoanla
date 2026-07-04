import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  FileSearch,
  Leaf,
  Microscope,
  ScanLine,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

const cnnResults = [
  { label: "Cà chua - Đốm vi khuẩn", score: "84%", tone: "bg-leaf-500" },
  { label: "Ớt chuông - Đốm lá", score: "7%", tone: "bg-emerald-300" },
  { label: "Táo - Gỉ sắt", score: "4%", tone: "bg-lime-300" },
  { label: "Ngô - Khỏe mạnh", score: "3%", tone: "bg-sun-400" },
  { label: "Nho - Esca", score: "2%", tone: "bg-amber-300" },
];

const heroStats = [
  { label: "Ảnh lá", value: "Upload / Camera" },
  { label: "AI thị giác", value: "YOLO + CNN" },
  { label: "Nguồn web", value: "Tavily + DeepSeek" },
];

const leafSamples = [
  { src: "/illustrations/leaf-sample-tomato.svg", label: "Cà chua" },
  { src: "/illustrations/leaf-sample-grape.svg", label: "Nho" },
  { src: "/illustrations/leaf-sample-corn.svg", label: "Ngô" },
];

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_16%_14%,rgba(180,228,195,0.58),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(245,211,115,0.26),transparent_30%),linear-gradient(180deg,#f9fbf4_0%,#eff8e9_48%,#fbfaf1_100%)] px-4 pb-20 pt-28 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_16%_14%,rgba(47,166,100,0.24),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(255,207,82,0.14),transparent_30%),linear-gradient(180deg,#04180f_0%,#08281a_48%,#04150d_100%)] sm:px-6 sm:pt-[7.5rem] lg:px-8 lg:pb-28 lg:pt-32"
    >
      <div className="absolute inset-0 -z-10 opacity-[0.28] [background-image:linear-gradient(120deg,rgba(11,78,48,0.08)_1px,transparent_1px),linear-gradient(60deg,rgba(11,78,48,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute -left-32 top-28 -z-10 h-72 w-72 rounded-full bg-leaf-300/30 blur-3xl" />
      <div className="absolute -right-32 bottom-20 -z-10 h-80 w-80 rounded-full bg-sun-100/80 blur-3xl" />

      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-leaf-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-lime-100">
            <Leaf size={16} />
            AI nông nghiệp cho người trồng cây Việt Nam
          </div>

          <h1 className="mt-7 max-w-4xl font-display text-5xl font-semibold tracking-[-0.045em] text-ink-900 dark:text-white sm:text-6xl lg:text-7xl">
            Chẩn đoán bệnh lá cây bằng AI, đối chiếu triệu chứng từ nguồn web.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 dark:text-emerald-50/80">
            Agromind AI giúp người trồng cây tải ảnh lá, nhận kết quả CNN, đối chiếu triệu chứng thực tế và nhận khuyến nghị chăm sóc phù hợp.
          </p>

          <div className="mt-5 inline-flex max-w-2xl items-start gap-3 rounded-[22px] border border-leaf-200/80 bg-white/80 px-4 py-3 text-sm font-semibold leading-6 text-leaf-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-emerald-50">
            <CheckCircle2 className="mt-0.5 shrink-0 text-leaf-600 dark:text-lime-200" size={18} />
            Hỗ trợ nhận diện nhiều cây trồng, gợi ý triệu chứng và khuyến nghị chăm sóc.
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login?next=/dashboard/diagnosis" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Chẩn đoán ngay
              <ArrowRight size={18} />
            </Link>
            <a href="#quy-trinh" className={buttonVariants({ variant: "secondaryOnLight", size: "lg" })}>
              Xem quy trình AI
            </a>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {heroStats.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/80 bg-white/75 p-4 shadow-[0_18px_60px_rgba(17,64,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/10"
              >
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-leaf-700 dark:text-lime-100">{item.label}</p>
                <p className="mt-2 font-display text-xl font-semibold text-ink-900 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-[24px] border border-amber-200/80 bg-amber-50/85 p-4 text-sm leading-7 text-amber-950 shadow-sm dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-50">
            Kết quả AI mang tính tham khảo, nên kết hợp quan sát thực địa hoặc hỏi chuyên gia khi bệnh lan rộng.
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative lg:mt-8">
          <div className="absolute inset-0 -z-10 rounded-[56px] bg-gradient-to-br from-leaf-300/45 via-white/10 to-sun-100/60 blur-3xl" />
          <Card className="relative overflow-hidden rounded-[40px] border-white/80 bg-white/75 p-4 shadow-[0_30px_90px_rgba(13,54,35,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-6">
            <div className="absolute left-6 top-6 flex gap-2">
              <span className="h-3 w-3 rounded-full bg-red-300" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-300" />
            </div>
            <div className="absolute right-6 top-5 rounded-full border border-leaf-200 bg-leaf-50 px-3 py-1 text-xs font-bold text-leaf-900 dark:border-white/10 dark:bg-white/10 dark:text-lime-100">
              Agromind AI dashboard
            </div>

            <div className="grid gap-5 pt-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <div className="rounded-[32px] bg-gradient-to-br from-[#08291b] via-[#0d3a25] to-[#082016] p-5 text-white shadow-float">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-50/90">Ảnh đầu vào</p>
                      <h3 className="mt-2 font-display text-2xl font-semibold">Tải ảnh lá cây</h3>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 text-lime-200">
                      <UploadCloud size={22} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {leafSamples.map((sample) => (
                      <div key={sample.label} className="rounded-[22px] border border-white/10 bg-white/10 p-2">
                        <Image
                          src={sample.src}
                          alt={`Ảnh lá ${sample.label}`}
                          width={120}
                          height={90}
                          className="h-20 w-full rounded-2xl object-contain"
                        />
                        <p className="mt-2 text-center text-[11px] font-bold text-emerald-50/90">{sample.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-[22px] border border-lime-200/20 bg-lime-200/10 p-3">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="text-lime-200" size={22} />
                      <div>
                        <p className="text-sm font-semibold">YOLO đã xác thực lá</p>
                        <p className="text-xs font-medium text-emerald-50/80">Vùng lá rõ, đủ điều kiện chạy CNN</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-lime-200 px-3 py-1 text-xs font-bold text-emerald-950">98%</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[28px] border border-leaf-100 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-leaf-100 p-3 text-leaf-700">
                        <FileSearch size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-leaf-800 dark:text-lime-100">Tavily</p>
                        <p className="font-display text-lg font-semibold text-ink-900 dark:text-white">Tìm nguồn web</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-emerald-50/75">Đối chiếu triệu chứng người dùng nhập với nguồn tham khảo nông nghiệp.</p>
                  </div>

                  <div className="rounded-[28px] border border-emerald-100 bg-emerald-950 p-4 text-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white/10 p-3 text-lime-200">
                        <BrainCircuit size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-50/90">DeepSeek</p>
                        <p className="font-display text-lg font-semibold">Tổng hợp kết luận</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-emerald-50/90">Chốt kết quả cuối cùng và giải thích dễ hiểu cho người trồng cây.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-leaf-100 bg-white/95 p-5 shadow-[0_24px_70px_rgba(16,70,44,0.1)] dark:border-white/10 dark:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-leaf-800 dark:text-lime-100">CNN top 5</p>
                      <h3 className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-white">Kết quả khả nghi nhất</h3>
                    </div>
                    <div className="rounded-2xl bg-leaf-50 p-3 text-leaf-700">
                      <Microscope size={22} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {cnnResults.map((item, index) => (
                      <div key={item.label} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/10">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink-900 dark:text-emerald-50">
                            {index + 1}. {item.label}
                          </p>
                          <span className="text-sm font-bold text-leaf-700 dark:text-lime-100">{item.score}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div className={`h-full rounded-full ${item.tone}`} style={{ width: item.score }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-[30px] border border-emerald-100 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
                    <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      Triệu chứng
                    </div>
                    <p className="font-display text-xl font-semibold text-ink-900 dark:text-white">“Đốm vàng nhỏ li ti, mép lá khô nhẹ”</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-emerald-50/75">Người dùng có thể nhập hoặc bỏ qua; hệ thống vẫn giữ kết quả CNN khi không có mô tả.</p>
                  </div>

                  <div className="rounded-[30px] border border-lime-200 bg-gradient-to-br from-lime-50 to-white p-5 shadow-sm dark:border-lime-200/20 dark:from-lime-300/10 dark:to-white/10">
                    <div className="mb-4 flex items-center gap-2 text-leaf-700">
                      <CheckCircle2 size={20} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Khuyến nghị</span>
                    </div>
                    <p className="font-display text-xl font-semibold text-ink-900 dark:text-white">Cách ly lá bệnh, chụp lại sau 3 ngày và theo dõi độ ẩm.</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-emerald-50/75">Gợi ý hành động riêng theo kết quả cuối cùng, không dùng câu trả lời chung chung.</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-gradient-to-r from-leaf-900 via-emerald-800 to-leaf-700 p-4 text-white shadow-float">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                      <Camera size={16} /> Ảnh lá
                    </span>
                    <ArrowRight size={16} className="text-lime-200" />
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                      <ScanLine size={16} /> YOLO
                    </span>
                    <ArrowRight size={16} className="text-lime-200" />
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                      <Sparkles size={16} /> CNN + DeepSeek
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
