import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { PricingPageContent } from "@/components/public-pages/product-pages";

export const metadata: Metadata = {
  title: "Bảng giá Seed, Grow, Bloom, Elite | Agromind AI",
  description: "So sánh các gói Seed miễn phí, Grow, Bloom và Elite của Agromind AI. Xem giá, quyền lợi và lựa chọn phù hợp trước khi nâng cấp.",
  alternates: { canonical: "/bang-gia" },
  openGraph: { title: "Bảng giá Agromind AI", url: "/bang-gia", images: ["/og-image.jpg"] },
};

export default function PricingPage() {
  return <AppShell plain><Navbar /><PricingPageContent /><Footer /></AppShell>;
}
