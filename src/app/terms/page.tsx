import type { Metadata } from "next";

import { LegalArticle } from "@/components/legal/legal-article";
import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { termsDoc } from "@/data/legal-content";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | Agromind AI",
  description: "Điều khoản sử dụng dịch vụ Agromind AI.",
  // Thiếu dòng này thì Next kế thừa `alternates: { canonical: "/" }` của
  // layout, và trang tự khai mình là bản trùng lặp của trang chủ — trong khi
  // nó vẫn nằm trong sitemap.
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <AppShell>
      <Navbar />
      <main id="main-content">
        <LegalArticle doc={termsDoc} />
      </main>
      <Footer />
    </AppShell>
  );
}
