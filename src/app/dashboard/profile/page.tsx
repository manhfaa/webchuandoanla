"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { pricingPlans } from "@/data/mock/plans";
import { useSessionStore } from "@/store/session-store";

export default function DashboardProfilePage() {
  const { user, updateProfileLocal, setPlan } = useSessionStore();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentPlan = useMemo(
    () => pricingPlans.find((plan) => plan.id === user?.currentPlan),
    [user?.currentPlan],
  );

  const displayName = user?.name ?? "Người dùng Agromind AI";
  const avatarSrc = avatarPreview ?? user?.avatar ?? "/avatars/user-demo.svg";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
          <div className="flex items-start gap-4">
            <div className="group relative shrink-0">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setAvatarPreview(url);
                  toast.message("Ảnh xem trước", {
                    description: "Đồng bộ avatar lên máy chủ sẽ có trong bản cập nhật sau.",
                  });
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border-dark ring-2 ring-leaf-500/20 transition hover:ring-leaf-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400"
                aria-label="Thay đổi ảnh đại diện"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src={avatarSrc}
                    alt={displayName}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900/50 opacity-0 transition group-hover:opacity-100">
                  <Camera strokeWidth={1.75} className="h-6 w-6 text-on-dark" aria-hidden />
                  <span className="mt-1 text-caption font-medium text-on-dark">Thay đổi</span>
                </span>
              </button>
            </div>
            <div>
              <p className="text-overline text-muted-on-dark">Hồ sơ người dùng</p>
              <h2 className="mt-2 text-h2 text-on-dark-strong">{displayName}</h2>
              <p className="mt-2 text-body-sm text-muted-on-dark">{user?.email}</p>
              <div className="mt-5 rounded-lg border border-border-dark bg-app-surface-2 px-4 py-3 text-body-sm leading-relaxed text-muted-on-dark">
                Gói hiện tại:{" "}
                <span className="font-semibold text-leaf-300">{currentPlan?.name ?? "Free"}</span>
                <br />
                Bạn có thể cập nhật tên hiển thị và email tại đây.
              </div>
            </div>
          </div>
        </Card>

        <Card variant="light" padding="lg" className="shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Tên người dùng" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => {
                updateProfileLocal({ name, email });
                toast.success("Đã lưu thông tin hồ sơ.");
              }}
            >
              Lưu thay đổi
            </Button>
            <LanguageToggle />
          </div>
        </Card>
      </div>

      <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-overline text-muted-on-dark">Gói dịch vụ</p>
            <h3 className="mt-2 text-h2 text-on-dark-strong">Chọn gói phù hợp với bạn</h3>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-muted-on-dark">
              Mỗi gói phù hợp với một mức sử dụng khác nhau. Bạn có thể nâng cấp hoặc hạ cấp bất cứ lúc nào.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={user?.currentPlan}
              onSelect={(planId) => {
                setPlan(planId);
                toast.success("Đã cập nhật gói", { description: `Gói hiện tại: ${planId}` });
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
