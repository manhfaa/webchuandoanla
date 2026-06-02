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
import { useSessionStore } from "@/store/session-store";

export default function DashboardProfilePage() {
  const router = useRouter();
  const { user, status, updateProfile } = useSessionStore();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setAvatarUrl(user?.avatar ?? "");
  }, [user]);

  const currentPlan = useMemo(
    () => pricingPlans.find((plan) => plan.id === user?.currentPlan),
    [user?.currentPlan],
  );

  const displayName = user?.name ?? "Người dùng Agromind AI";
  const avatarSrc = avatarUrl || user?.avatar || "/avatars/user-demo.svg";

  async function handleSaveProfile() {
    try {
      await updateProfile({ name, email, avatar: avatarUrl });
      toast.success("Đã lưu hồ sơ lên backend.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu hồ sơ.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border-dark ring-2 ring-leaf-500/20">
              <Image src={avatarSrc} alt={displayName} width={160} height={160} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-overline text-muted-on-dark">Hồ sơ người dùng</p>
              <h2 className="mt-2 text-h2 text-on-dark-strong">{displayName}</h2>
              <p className="mt-2 text-body-sm text-muted-on-dark">{user?.email}</p>
              <div className="mt-5 rounded-lg border border-border-dark bg-app-surface-2 px-4 py-3 text-body-sm leading-relaxed text-muted-on-dark">
                Gói hiện tại: <span className="font-semibold text-leaf-300">{currentPlan?.name ?? "Seed"}</span>
                <br />
                Hồ sơ được lưu trực tiếp vào Django backend.
              </div>
            </div>
          </div>
        </Card>

        <Card variant="light" padding="lg" className="shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Tên người dùng" value={name} onChange={(event) => setName(event.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <div className="md:col-span-2">
              <Input
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

      <Card variant="dark" padding="lg" className="border-border-dark bg-app-surface text-on-dark">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-overline text-muted-on-dark">Gói dịch vụ</p>
            <h3 className="mt-2 text-h2 text-on-dark-strong">Quản lý gói qua thanh toán backend</h3>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-muted-on-dark">
              Chọn gói sẽ đưa bạn sang checkout. Gói chỉ đổi sau khi backend xác nhận thanh toán.
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
