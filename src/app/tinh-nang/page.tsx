import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { FeaturesPageContent } from "@/components/public-pages/product-pages";

export const metadata: Metadata = {
  title: "Tính năng kiểm tra lá và quản lý vườn | Agromind AI",
  description: "Khám phá các công cụ Agromind AI: kiểm tra ảnh lá, theo dõi thời tiết, lưu lịch sử, quản lý lô vườn, lập kế hoạch và chat tư vấn.",
  alternates: { canonical: "/tinh-nang" },
  openGraph: { title: "Tính năng Agromind AI", url: "/tinh-nang", images: ["/og-image.jpg"] },
};

export default function FeaturesPage() {
  return <AppShell plain><Navbar /><FeaturesPageContent /><Footer /></AppShell>;
}
