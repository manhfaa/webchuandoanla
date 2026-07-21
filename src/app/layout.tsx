import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { BackendWakeup } from "@/components/system/backend-wakeup";
import { brand } from "@/constants/brand";
import { ThemeProvider } from "@/components/layout/theme-provider";

import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${brand.name} | Theo dõi sức khỏe cây từ ảnh lá`,
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
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
        >
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-leaf px-4 py-2 text-sm font-medium text-on-leaf opacity-0 shadow-lg transition duration-200 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Bỏ qua đến nội dung chính
          </a>
          <BackendWakeup />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
