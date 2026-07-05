import { brand } from "@/constants/brand";
import { landingNavItems } from "@/constants/navigation";

import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[36px] bg-[#10231c] px-6 py-8 text-white shadow-float sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo dark />
            <p className="max-w-md text-sm leading-7 text-emerald-50/75">
              {brand.description}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Link nhanh
            </h3>
            {landingNavItems.map((item) => (
              <a key={item.href} href={item.href} className="block text-sm text-emerald-50/75 transition hover:text-white">
                {item.label}
              </a>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Người dùng có thể
            </h3>
            <p className="text-sm text-emerald-50/75">Tải ảnh lá để kiểm tra ban đầu</p>
            <p className="text-sm text-emerald-50/75">Nhập triệu chứng đã quan sát</p>
            <p className="text-sm text-emerald-50/75">Lưu lịch sử theo dõi cây</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/60">
              Lưu ý
            </h3>
            <p className="text-sm leading-7 text-emerald-50/75">
              Kết quả AI mang tính tham khảo. Khi cây bệnh nặng hoặc lan nhanh, nên hỏi thêm chuyên gia nông nghiệp tại địa phương.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-4 text-sm text-emerald-50/60">
          Agromind AI 2026. Hỗ trợ kiểm tra ảnh lá cây, đối chiếu triệu chứng và theo dõi chăm sóc cây bằng AI.
        </div>
      </div>
    </footer>
  );
}
