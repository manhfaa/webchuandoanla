"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { pricingPlans } from "@/data/mock/plans";
import { normalizeUserDisplayName } from "@/lib/user-profile";
import { useSessionStore } from "@/store/session-store";

export default function DashboardProfilePage() {
  const router = useRouter();
  const { user, status, updateProfile } = useSessionStore();
  const [name, setName] = useState(normalizeUserDisplayName(user?.name));
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");

  useEffect(() => {
    setName(normalizeUserDisplayName(user?.name));
    setEmail(user?.email ?? "");
    setAvatarUrl(user?.avatar ?? "");
  }, [user]);

  const currentPlan = useMemo(
    () => pricingPlans.find((plan) => plan.id === user?.currentPlan),
    [user?.currentPlan],
  );

  const displayName = normalizeUserDisplayName(user?.name);
  const avatarSrc = avatarUrl || user?.avatar || "/avatars/user-demo.svg";

  async function handleSaveProfile() {
    try {
      await updateProfile({ name, email, avatar: avatarUrl });
      toast.success("Đã lưu thay đổi hồ sơ.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu hồ sơ.");
    }
  }

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="dark" padding="lg" className="field-contours rounded-xl">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-on-forest/15 ring-2 ring-on-forest/10">
              <Image src={avatarSrc} alt={displayName} width={160} height={160} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-overline text-on-forest-muted">Hồ sơ người dùng</p>
              <h2 className="mt-2 text-h2 font-bold text-on-forest">{displayName}</h2>
              <p className="mt-2 text-body-sm text-on-forest-muted">{user?.email}</p>
              <div className="mt-5 rounded-lg border border-on-forest/10 bg-on-forest/5 px-4 py-3 text-body-sm leading-relaxed text-on-forest-muted">
                Gói hiện tại: <span className="font-semibold text-on-forest">{currentPlan?.name ?? "Seed"}</span>
                <br />
                Thông tin này được đồng bộ theo tài khoản của bạn.
              </div>
            </div>
          </div>
        </Card>

        <Card variant="raised" padding="lg" className="rounded-xl shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Input tone="light" label="Tên người dùng" value={name} onChange={(event) => setName(event.target.value)} />
            <Input tone="light" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <div className="md:col-span-2">
              <Input
                tone="light"
                label="Avatar URL"
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={handleSaveProfile} loading={status === "loading"}>
              Lưu thay đổi
            </Button>
            <LanguageToggle />
          </div>
        </Card>
      </div>

      <Card variant="default" padding="lg" className="rounded-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-overline text-leaf-strong">Gói dịch vụ</p>
            <h3 className="mt-2 text-h2 font-bold text-ink">Chọn mức sử dụng phù hợp</h3>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-ink-soft">
              So sánh quyền lợi và chuyển đến bước xác nhận trước khi thay đổi gói.
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
                if (planId === user?.currentPlan) return;
                if (planId === "seed") {
                  router.push("/dashboard/pricing");
                  return;
                }
                router.push(`/dashboard/pricing/checkout/${planId}`);
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
