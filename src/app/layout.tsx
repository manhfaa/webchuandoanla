import type { Metadata } from "next";

import { BackendWakeup } from "@/components/system/backend-wakeup";
import { brand } from "@/constants/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.name} | AI xác thực ảnh lá cây`,
  description: brand.description,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white opacity-0 shadow-lg transition duration-200 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50"
        >
          Bỏ qua đến nội dung chính
        </a>
        <BackendWakeup />
        {children}
      </body>
    </html>
  );
}
