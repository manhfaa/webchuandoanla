import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";

import { BackendWakeup } from "@/components/system/backend-wakeup";
import { ClarityAnalytics } from "@/components/system/clarity-analytics";
import { GoogleAnalytics } from "@/components/system/google-analytics";
import { StructuredData } from "@/components/system/structured-data";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agromind.farm";
const PAGE_TITLE = `${brand.name} | Theo dõi sức khỏe cây từ ảnh lá`;

export const metadata: Metadata = {
  // Without this, every relative URL Next.js resolves for Open Graph and
  // canonical tags falls back to localhost in the built output — so a shared
  // link renders no preview. Overridable per environment so Vercel previews
  // describe themselves rather than production.
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: brand.description,
  // The apex 308-redirects to www, so both spellings reach the same page. A
  // canonical tells Google which one is the page rather than leaving it to
  // guess and split the ranking between two addresses.
  alternates: { canonical: "/" },
  keywords: [
    "chẩn đoán bệnh cây",
    "bệnh lá cây",
    "nhận diện bệnh cây bằng AI",
    "chăm sóc cây trồng",
    "nông nghiệp thông minh",
    "kiểm tra lá cây",
    "Agromind",
  ],
  authors: [{ name: brand.name }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google show a full text snippet and a large image in results
      // instead of the truncated default.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: brand.name,
    title: PAGE_TITLE,
    description: brand.description,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Người trồng dùng Agromind AI kiểm tra lá cây ngoài vườn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: brand.description,
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  // Google Search Console ownership. Not a secret — it is published in the page
  // by design, and it only proves control of this site. Google drops the
  // property if the proof disappears, so this stays even after verification.
  verification: {
    google: "RlWU-FDHDMAIkz5YG_2rTuHV8YmD70uqx13vdyHSF-I",
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
          <StructuredData />
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
