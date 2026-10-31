import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { SupportContent } from "@/components/support/support-content";

export const metadata: Metadata = {
  title: "Liên hệ & hỗ trợ | Agromind AI",
  description: "Liên hệ nhóm phát triển Agromind AI để được hỗ trợ tài khoản, thanh toán và sử dụng dịch vụ.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <AppShell>
      <Navbar />
      <main id="main-content">
        <SupportContent />
      </main>
      <Footer />
    </AppShell>
  );
}
