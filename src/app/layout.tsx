import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";

import { BackendWakeup } from "@/components/system/backend-wakeup";
import { ClarityAnalytics } from "@/components/system/clarity-analytics";
import { GoogleAnalytics } from "@/components/system/google-analytics";
import { brand } from "@/constants/brand";
import { HtmlLangSync } from "@/components/layout/html-lang-sync";
import { SkipLink } from "@/components/layout/skip-link";
import { ThemeProvider } from "@/components/layout/theme-provider";

import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  // Without this, every relative URL Next.js resolves for Open Graph and
  // canonical tags falls back to localhost in the built output — so a shared
  // link renders no preview. Overridable per environment so Vercel previews
  // describe themselves rather than production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://agromind.io.vn"),
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
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${beVietnamPro.variable} ${bricolage.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          enableColorScheme
          disableTransitionOnChange
        >
          <HtmlLangSync />
          <SkipLink />
          <BackendWakeup />
          {children}
          <ClarityAnalytics />
          <GoogleAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
