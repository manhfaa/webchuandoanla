import type { Metadata } from "next";

import { GuideView } from "@/components/guide/guide-view";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AppShell } from "@/components/layout/layout-components";

export const metadata: Metadata = {
  title: "Cách chụp ảnh lá cây và đọc kết quả AI | Agromind AI",
  description:
    "Hướng dẫn chụp ảnh lá rõ, bổ sung triệu chứng, đọc các khả năng và mức độ tin cậy, rồi theo dõi lại để kiểm tra bệnh cây bằng Agromind AI.",
  alternates: { canonical: "/huong-dan" },
  openGraph: {
    title: "Cách chụp ảnh lá cây và đọc kết quả AI",
    description: "Chuẩn bị ảnh lá rõ, hiểu giới hạn của gợi ý AI và theo dõi thay đổi sau lần kiểm tra đầu.",
    url: "/huong-dan",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Agromind AI kiểm tra ảnh lá cây" }],
  },
};

export default function GuidePage() {
  return (
    <AppShell>
      <Navbar />
      <GuideView />
      <Footer />
    </AppShell>
  );
}
