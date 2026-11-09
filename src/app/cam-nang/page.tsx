import type { Metadata } from "next";

import { FieldGuideIndex } from "@/components/cam-nang/field-guide-index";
import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "Cẩm nang nhận biết bệnh lá cây | Agromind AI",
  description: "Hướng dẫn quan sát bệnh lá cà chua, ớt chuông và nho: triệu chứng, nguyên nhân dễ nhầm, việc nên làm tiếp và nguồn khuyến nông đối chiếu.",
  alternates: { canonical: "/cam-nang" },
  openGraph: { title: "Cẩm nang bệnh lá cây | Agromind AI", description: "Quan sát dấu hiệu, phân biệt nguyên nhân và chọn việc nên làm tiếp.", url: "/cam-nang", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Agromind AI" }] },
};

export default function FieldGuideIndexPage() {
  return <AppShell><Navbar /><FieldGuideIndex /><Footer /></AppShell>;
}
