"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, ClipboardCheck, CloudSun, History, Leaf, MessageSquare, ScanSearch, Sprout } from "lucide-react";

import { PricingPreviewSection } from "@/components/home/pricing-preview-section";
import { landingPhotos } from "@/constants/landing-photos";
import { useTr } from "@/lib/use-tr";

function Intro({ number, eyebrow, eyebrowEn, title, titleEn, description, descriptionEn }: {
  number: string;
  eyebrow: string;
  eyebrowEn: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
}) {
  const tr = useTr();
  return (
    <header className="border-b border-line bg-surface px-4 pb-14 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pt-36">
      <div className="mx-auto max-w-7xl border-t border-line pt-5">
        <p className="kicker"><span className="tabular-nums">{number}</span>{tr(eyebrow, eyebrowEn)}</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-end lg:gap-12">
          <h1 className="max-w-[19ch] font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-5xl lg:text-[64px]">
            {tr(title, titleEn)}
          </h1>
          <p className="max-w-xl text-base leading-8 text-ink-soft sm:text-lg">{tr(description, descriptionEn)}</p>
        </div>
      </div>
    </header>
  );
}

const processSteps = [
  { icon: Camera, title: "Chụp ảnh lá", titleEn: "Photograph the leaf", body: "Chụp một chiếc lá chính ở nơi đủ sáng, thấy rõ cả vùng có dấu hiệu và phần lá xung quanh.", bodyEn: "Photograph one main leaf in good light, showing both the affected area and the surrounding leaf." },
  { icon: ScanSearch, title: "Xem các khả năng", titleEn: "Review possible causes", body: "Ảnh được kiểm tra chất lượng trước; kết quả hiển thị các khả năng cùng điểm tin cậy để bạn cân nhắc.", bodyEn: "The image is checked first; possible results and confidence scores help you assess them." },
  { icon: ClipboardCheck, title: "Đối chiếu ngoài vườn", titleEn: "Cross-check in the garden", body: "So sánh gợi ý với màu, vị trí vết bệnh và nguồn tham khảo. Điểm tin cậy không phải chẩn đoán chắc chắn.", bodyEn: "Compare suggestions with the mark's colour and location and with reference sources. A score is not a certain diagnosis." },
  { icon: History, title: "Lưu và theo dõi", titleEn: "Save and follow up", body: "Lưu kết quả, ghi lại khu vực trồng và chụp lại sau vài ngày để xem dấu hiệu có thay đổi không.", bodyEn: "Save the result, record the growing area and take another photo after a few days to track changes." },
];

export function ProcessPageContent() {
  const tr = useTr();
  return (
    <main id="main-content">
      <Intro number="01" eyebrow="Quy trình" eyebrowEn="How it works" title="Từ một chiếc lá đến việc cần làm tiếp." titleEn="From one leaf to the next useful step." description="Agromind AI giúp bạn kiểm tra dấu hiệu trên lá, đọc kết quả có cơ sở và theo dõi thay đổi theo thời gian. Đây là công cụ hỗ trợ quan sát, không thay thế chuyên gia." descriptionEn="Agromind AI helps you inspect leaf signs, understand the result and follow changes over time. It supports observation; it does not replace an expert." />
      <section className="bg-canvas px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-label={tr("Bốn bước sử dụng", "Four steps to use") }>
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-xl)] bg-forest">
              <Image src={landingPhotos.storyGrape.src} alt={tr(landingPhotos.storyGrape.alt, landingPhotos.storyGrape.altEn)} fill sizes="(min-width:1024px) 40vw,100vw" className="object-cover" />
            </div>
            <a href={landingPhotos.storyGrape.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-ink-muted underline-offset-2 hover:underline">{tr("Ảnh", "Photo")}: {landingPhotos.storyGrape.credit}</a>
          </div>
          <ol className="border-t border-line">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return <li key={step.title} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-b border-line py-6 sm:grid-cols-[56px_minmax(0,1fr)] sm:py-8">
                <span className="font-display text-sm font-bold tabular-nums text-leaf-strong">{String(index + 1).padStart(2, "0")}</span>
                <div><Icon size={22} className="mb-3 text-leaf-strong" aria-hidden /><h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{tr(step.title, step.titleEn)}</h2><p className="mt-2 max-w-[60ch] text-sm leading-7 text-ink-soft">{tr(step.body, step.bodyEn)}</p></div>
              </li>;
            })}
          </ol>
        </div>
      </section>
      <section className="bg-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-display text-xl font-bold text-ink">{tr("Chuẩn bị ảnh tốt trước khi bắt đầu", "Get a clear photo before you start")}</h2><p className="mt-2 text-sm leading-6 text-ink-soft">{tr("Ảnh mờ, ngược sáng hoặc bị che khuất có thể làm kết quả kém phù hợp.", "Blurred, backlit or obstructed images can make the result less useful.")}</p></div>
          <Link href="/huong-dan" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-leaf-strong hover:underline">{tr("Đọc hướng dẫn chụp ảnh", "Read the photo guide")}<ArrowRight size={16} aria-hidden /></Link>
        </div>
      </section>
    </main>
  );
}

const featureGroups = [
  { icon: ScanSearch, title: "Kiểm tra ảnh lá", titleEn: "Leaf image check", body: "Xác nhận ảnh đủ rõ rồi xem các khả năng bệnh được xếp hạng kèm điểm tin cậy.", bodyEn: "Check image quality and review ranked possible conditions with confidence scores.", href: "/login?next=/dashboard/diagnosis" },
  { icon: CloudSun, title: "Thời tiết và cảnh báo", titleEn: "Weather and alerts", body: "Theo dõi điều kiện tại vị trí vườn để cân nhắc việc chăm sóc cây.", bodyEn: "Track conditions at your garden location to inform plant care.", href: "/login?next=/dashboard/weather-alerts" },
  { icon: History, title: "Lịch sử kiểm tra", titleEn: "Check history", body: "Mở lại ảnh và kết quả trước đó để so sánh các lần kiểm tra.", bodyEn: "Revisit earlier photos and results to compare checks.", href: "/login?next=/dashboard/history" },
  { icon: Sprout, title: "Lô vườn và kế hoạch", titleEn: "Plots and plans", body: "Gắn kết quả với khu vực trồng và sắp xếp việc chăm sóc theo giai đoạn.", bodyEn: "Associate results with growing areas and organize care by stage.", href: "/login?next=/dashboard/farms" },
  { icon: MessageSquare, title: "Chat tư vấn", titleEn: "Advisory chat", body: "Đặt câu hỏi từ kết quả đã lưu hoặc từ vấn đề canh tác bạn gặp phải.", bodyEn: "Ask about a saved result or another growing issue.", href: "/login?next=/dashboard/chat" },
  { icon: Leaf, title: "Cây và bệnh được hỗ trợ", titleEn: "Supported crops and diseases", body: "Xem phạm vi cây trồng và dấu hiệu sâu bệnh trước khi tải ảnh lên.", bodyEn: "Check supported crops and disease signs before uploading a photo.", href: "/benh-cay" },
];

export function FeaturesPageContent() {
  const tr = useTr();
  return <main id="main-content">
    <Intro number="02" eyebrow="Tính năng" eyebrowEn="Features" title="Quan sát rõ. Theo dõi liền mạch." titleEn="See clearly. Follow through." description="Từ ảnh lá ban đầu đến lịch sử và kế hoạch chăm sóc, các công cụ được nối trong cùng một không gian làm việc." descriptionEn="From the first leaf photo to history and care plans, the tools connect in one workspace." />
    <section className="bg-canvas px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-label={tr("Các tính năng Agromind AI", "Agromind AI features") }>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4 border-t border-line pt-5"><h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{tr("Một hành trình, nhiều công cụ", "One journey, several tools")}</h2><span className="text-sm font-semibold tabular-nums text-leaf-strong">01 — 06</span></div>
        <div className="grid border-l border-t border-line md:grid-cols-2 lg:grid-cols-3">
          {featureGroups.map((feature, index) => {
            const Icon = feature.icon;
            return <Link key={feature.title} href={feature.href} className="group flex min-h-[260px] flex-col border-b border-r border-line bg-surface p-6 transition-colors hover:bg-surface-soft sm:p-8">
              <div className="flex items-center justify-between"><Icon size={24} className="text-leaf-strong" aria-hidden /><span className="text-xs font-bold tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span></div>
              <h3 className="mt-10 font-display text-xl font-bold text-ink">{tr(feature.title, feature.titleEn)}</h3>
              <p className="mt-3 max-w-[38ch] text-sm leading-7 text-ink-soft">{tr(feature.body, feature.bodyEn)}</p>
              <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-leaf-strong">{tr("Khám phá", "Explore")}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden /></span>
            </Link>;
          })}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-ink-soft">{tr("Gợi ý AI chỉ mang tính tham khảo. Nếu dấu hiệu lan nhanh hoặc cần dùng thuốc, hãy hỏi chuyên gia nông nghiệp tại địa phương.", "AI suggestions are advisory. If signs spread quickly or pesticide use is involved, consult a local agriculture expert.")}</p>
      </div>
    </section>
  </main>;
}

export function PricingPageContent() {
  const tr = useTr();
  return <main id="main-content">
    <Intro number="03" eyebrow="Bảng giá" eyebrowEn="Pricing" title="Chọn mức sử dụng phù hợp với khu vườn." titleEn="Choose a plan that fits your garden." description="Bắt đầu với gói miễn phí, xem quyền lợi trước khi nâng cấp. Giá và giới hạn có thể thay đổi; hãy kiểm tra lại tại bước xác nhận thanh toán." descriptionEn="Start free and compare benefits before upgrading. Prices and limits may change; review them again before confirming payment." />
    <PricingPreviewSection standalone />
    <section className="bg-surface px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 border-t border-line pt-8 md:grid-cols-2">
        <div><h2 className="font-display text-xl font-bold text-ink">{tr("Có thể dùng miễn phí không?", "Can I use it for free?")}</h2><p className="mt-3 text-sm leading-7 text-ink-soft">{tr("Có. Gói Seed cho phép bạn bắt đầu mà không cần thanh toán. Giới hạn hiện hành được hiển thị trong bảng so sánh gói sau khi đăng nhập.", "Yes. Seed lets you start without payment. Current usage limits appear in the plan comparison after login.")}</p></div>
        <div><h2 className="font-display text-xl font-bold text-ink">{tr("Xem giá cuối cùng ở đâu?", "Where can I confirm the final price?")}</h2><p className="mt-3 text-sm leading-7 text-ink-soft">{tr("Trước khi xác nhận thanh toán, hãy kiểm tra lại giá, thời hạn và quyền lợi trên màn hình thanh toán. Nếu cần hỗ trợ, liên hệ với chúng tôi.", "Before confirming payment, review the price, term and benefits on the checkout screen. Contact us if you need help.")}</p><Link href="/support" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-leaf-strong hover:underline">{tr("Liên hệ hỗ trợ", "Contact support")}<ArrowRight size={16} aria-hidden /></Link></div>
      </div>
    </section>
  </main>;
}
