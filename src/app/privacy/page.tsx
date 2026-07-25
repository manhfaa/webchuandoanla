import type { Metadata } from "next";

import { LegalArticle } from "@/components/legal/legal-article";
import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { privacyDoc } from "@/data/legal-content";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư | Agromind AI",
  description: "Chính sách quyền riêng tư và xử lý dữ liệu của Agromind AI.",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <Navbar />
      <main id="main-content">
        <LegalArticle doc={privacyDoc} />
      </main>
      <Footer />
    </AppShell>
  );
}
