import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { ProcessPageContent } from "@/components/public-pages/product-pages";

export const metadata: Metadata = {
  title: "Quy trình kiểm tra ảnh lá cây | Agromind AI",
  description: "Tìm hiểu bốn bước dùng Agromind AI: chụp ảnh lá, xem các khả năng, đối chiếu dấu hiệu ngoài vườn và theo dõi thay đổi.",
  alternates: { canonical: "/quy-trinh" },
  openGraph: { title: "Quy trình kiểm tra ảnh lá cây | Agromind AI", url: "/quy-trinh", images: ["/og-image.jpg"] },
};

export default function ProcessPage() {
  return <AppShell plain><Navbar /><ProcessPageContent /><Footer /></AppShell>;
}
