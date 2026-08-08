import type { Metadata } from "next";

/**
 * The page itself is a client component and cannot export metadata, so without
 * this it inherited the landing page's title and Google saw two different URLs
 * claiming to be the same thing. /register is in the sitemap at priority 0.8 —
 * it is the page a search result should land on when somebody is ready to try
 * the product rather than read about it.
 */
export const metadata: Metadata = {
  title: "Đăng ký miễn phí | Agromind AI",
  description:
    "Tạo tài khoản Agromind AI để chụp ảnh lá, nhận diện dấu hiệu sâu bệnh trên cây trồng và lưu lại lịch sử chăm sóc khu vườn. Gói khởi đầu miễn phí.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
