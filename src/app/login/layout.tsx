import type { Metadata } from "next";

/**
 * Same reason as /register: a client component cannot export metadata, so this
 * page was inheriting the landing page's title.
 *
 * Kept in the sitemap at low priority rather than excluded — people do search
 * for a product's login page by name, and it is better that they find the real
 * one than something else claiming to be it.
 */
export const metadata: Metadata = {
  title: "Đăng nhập | Agromind AI",
  description: "Đăng nhập Agromind AI để xem lại kết quả kiểm tra ảnh lá, lịch sử chăm sóc và kế hoạch trồng của bạn.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
