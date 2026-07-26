"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { KeyRound, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { pricingPlans } from "@/data/mock/plans";
import {
  AVATAR_PLACEHOLDER,
  djangoAccount,
  djangoAccountDeletionPreview,
  djangoChangePassword,
  djangoDeleteAccount,
  djangoUpdateUserSettings,
  djangoUserSettings,
  type DjangoAccount,
  type DjangoAccountDeletionPreview,
  type DjangoUserSettings,
} from "@/lib/django-client";
import { applyCatalogue } from "@/lib/payments-client";
import { useEntitlements } from "@/lib/use-entitlements";
import { useTr } from "@/lib/use-tr";
import { normalizeUserDisplayName } from "@/lib/user-profile";
import { useLanguageStore } from "@/store/language-store";
import { useSessionStore } from "@/store/session-store";

type ProfileForm = {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  company_name: string;
  farm_name: string;
  location: string;
};

const EMPTY_FORM: ProfileForm = {
  full_name: "",
  email: "",
  phone: "",
  avatar_url: "",
  company_name: "",
  farm_name: "",
  location: "",
};

// Offered in the preferences card; the backend accepts any IANA name.
const TIMEZONES = ["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "UTC"];

function toForm(account: DjangoAccount): ProfileForm {
  return {
    full_name: normalizeUserDisplayName(account.full_name),
    email: account.email,
    phone: account.phone,
    avatar_url: account.avatar_url,
    company_name: account.company_name,
    farm_name: account.farm_name,
    location: account.location,
  };
}

export default function DashboardProfilePage() {
  const tr = useTr();
  const router = useRouter();
  const { setTheme } = useTheme();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const { user, status, updateProfile, applyAccount, adoptSession, logout } = useSessionStore();

  const [account, setAccount] = useState<DjangoAccount | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [settings, setSettings] = useState<DjangoUserSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePreview, setDeletePreview] = useState<DjangoAccountDeletionPreview | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextAccount, nextSettings] = await Promise.all([djangoAccount(), djangoUserSettings()]);
      setAccount(nextAccount);
      setForm(toForm(nextAccount));
      setAvatarBroken(false);
      setSettings(nextSettings);
      applyAccount(nextAccount);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : tr("Chưa tải được hồ sơ.", "Could not load your profile."));
    } finally {
      setLoading(false);
    }
    // tr/applyAccount are stable enough for a mount-time load; re-running on a
    // language switch would discard the user's unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  // Same catalogue the dashboard already loaded, so the cards here advertise
  // the live prices and quotas rather than a checked-in copy of them.
  const { catalogue } = useEntitlements();
  const plans = useMemo(() => applyCatalogue(pricingPlans, catalogue), [catalogue]);
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === user?.currentPlan),
    [plans, user?.currentPlan],
  );

  const displayName = normalizeUserDisplayName(user?.name);
  const avatarSrc = !avatarBroken && form.avatar_url ? form.avatar_url : AVATAR_PLACEHOLDER;

  const planExpiry = useMemo(() => {
    if (!account?.plan_expires_at) return null;
    const expiresAt = new Date(account.plan_expires_at);
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
    return { expiresAt, daysLeft };
  }, [account?.plan_expires_at]);

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "avatar_url") setAvatarBroken(false);
  }

  async function handleSaveProfile() {
    try {
      // Sent in full — including an emptied avatar_url — so clearing a field
      // actually clears it instead of being dropped from the PATCH body.
      const saved = await updateProfile(form);
      setAccount(saved);
      setForm(toForm(saved));
      toast.success(tr("Đã lưu thay đổi hồ sơ.", "Profile changes saved."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không thể lưu hồ sơ.", "Could not save profile."));
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(tr("Xác nhận mật khẩu chưa khớp.", "Password confirmation does not match."));
      return;
    }

    setChangingPassword(true);
    try {
      // Changing the password ends every other session, including this tab's
      // refresh token, so the freshly issued pair has to replace it.
      const renewed = await djangoChangePassword({ currentPassword, newPassword });
      await adoptSession({ access: renewed.access, refresh: renewed.refresh });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAccount((current) => (current ? { ...current, has_usable_password: true } : current));
      toast.success(tr("Đã cập nhật mật khẩu.", "Password updated."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Không đổi được mật khẩu.", "Could not change the password."));
    } finally {
      setChangingPassword(false);
    }
  }

  async function saveSettings(patch: Partial<Omit<DjangoUserSettings, "updated_at">>) {
    setSavingSettings(true);
    // Optimistic so a toggle responds immediately; rolled back on failure.
    const previous = settings;
    setSettings((current) => (current ? { ...current, ...patch } : current));
    try {
      const saved = await djangoUpdateUserSettings(patch);
      setSettings(saved);
      if (patch.theme) setTheme(patch.theme === "dark" ? "dark" : "light");
      if (patch.language) setLanguage(patch.language === "en" ? "en" : "vi");
    } catch (err) {
      setSettings(previous);
      toast.error(err instanceof Error ? err.message : tr("Không lưu được tùy chọn.", "Could not save your preferences."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function openDeleteDialog() {
    setDeleteError(null);
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteOpen(true);
    try {
      setDeletePreview(await djangoAccountDeletionPreview());
    } catch {
      // The dialog still lists the categories, just without counts.
      setDeletePreview(null);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await djangoDeleteAccount({ password: deletePassword, confirmText: deleteConfirmText });
      setDeleteOpen(false);
      logout();
      toast.success(tr("Đã xóa tài khoản và toàn bộ dữ liệu liên quan.", "Your account and all related data were deleted."));
      router.replace("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : tr("Không xóa được tài khoản.", "Could not delete the account."));
    } finally {
      setDeleting(false);
    }
  }

  const confirmPhrase = deletePreview?.confirm_phrase ?? "XÓA TÀI KHOẢN";
  const deletionRows = [
    { label: tr("Kết quả kiểm tra lá đã lưu", "Saved leaf check results"), count: deletePreview?.diagnoses },
    { label: tr("Lô vườn", "Farm plots"), count: deletePreview?.farm_plots },
    { label: tr("Nhật ký canh tác", "Cultivation logs"), count: deletePreview?.cultivation_logs },
    { label: tr("Mã QR truy xuất đang công khai", "Published traceability QR codes"), count: deletePreview?.traceability_records },
    { label: tr("Vị trí canh tác đã lưu", "Saved farm locations"), count: deletePreview?.farm_locations },
    { label: tr("Kế hoạch trồng", "Crop plans"), count: deletePreview?.crop_plans },
    { label: tr("Cuộc trò chuyện tư vấn", "Advisory conversations"), count: deletePreview?.chat_conversations },
    { label: tr("Lịch sử đơn thanh toán", "Payment order history"), count: deletePreview?.payment_orders },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-[1380px] space-y-6">
        <ListSkeleton count={3} itemClassName="h-[180px]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1380px]">
        <ErrorState description={loadError} onRetry={() => void loadAccount()} />
      </div>
    );
  }

  return (
    <div className="fl-stagger mx-auto max-w-[1380px] space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="dark" padding="lg" className="field-contours rounded-xl">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-on-forest/15 ring-2 ring-on-forest/10">
              <Image
                src={avatarSrc}
                alt={displayName}
                width={160}
                height={160}
                // User-supplied hosts are not in the image-optimizer allow-list,
                // so serve the URL as-is and fall back if it cannot be loaded.
                unoptimized
                onError={() => setAvatarBroken(true)}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-overline text-on-forest-muted">{tr("Hồ sơ người dùng", "User profile")}</p>
              <h2 className="mt-2 text-h2 font-bold text-on-forest">{displayName}</h2>
              <p className="mt-2 text-body-sm text-on-forest-muted">{user?.email}</p>
              <div className="mt-5 space-y-2 rounded-lg border border-on-forest/10 bg-on-forest/5 px-4 py-3 text-body-sm leading-relaxed text-on-forest-muted">
                <p>
                  {tr("Gói hiện tại:", "Current plan:")} <span className="font-semibold text-on-forest">{currentPlan?.name ?? "Seed"}</span>
                </p>
                {planExpiry ? (
                  <p className="flex flex-wrap items-center gap-2">
                    {tr("Hết hạn:", "Expires:")}{" "}
                    <span className="font-semibold text-on-forest">{planExpiry.expiresAt.toLocaleDateString("vi-VN")}</span>
                    <Badge variant={planExpiry.daysLeft <= 7 ? "warning" : "muted"}>
                      {planExpiry.daysLeft > 0
                        ? tr(`Còn ${planExpiry.daysLeft} ngày`, `${planExpiry.daysLeft} days left`)
                        : tr("Đã hết hạn", "Expired")}
                    </Badge>
                  </p>
                ) : (
                  <p>{tr("Gói Seed miễn phí, không có ngày hết hạn.", "The free Seed plan has no expiry date.")}</p>
                )}
                <p>{tr("Thông tin này được đồng bộ theo tài khoản của bạn.", "This information is synced with your account.")}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="raised" padding="lg" className="rounded-xl shadow-sm">
          <p className="text-overline text-leaf-strong">{tr("Thông tin cá nhân", "Personal details")}</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Input tone="light" label={tr("Tên người dùng", "Display name")} value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} />
            <Input tone="light" label="Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            <Input
              tone="light"
              label={tr("Số điện thoại", "Phone number")}
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="09xx xxx xxx"
            />
            <Input
              tone="light"
              label={tr("Khu vực canh tác", "Growing area")}
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder={tr("Ví dụ: Đà Lạt, Lâm Đồng", "For example: Da Lat, Lam Dong")}
            />
            <Input
              tone="light"
              label={tr("Tên vườn", "Farm name")}
              value={form.farm_name}
              onChange={(event) => updateField("farm_name", event.target.value)}
              placeholder={tr("Ví dụ: Vườn cà chua nhà kính", "For example: Greenhouse tomato garden")}
            />
            <Input
              tone="light"
              label={tr("Hợp tác xã / doanh nghiệp", "Cooperative or business")}
              value={form.company_name}
              onChange={(event) => updateField("company_name", event.target.value)}
              placeholder={tr("Ví dụ: HTX Rau sạch Đơn Dương", "For example: Don Duong clean vegetable co-op")}
            />
            <div className="md:col-span-2">
              <Input
                tone="light"
                label={tr("Ảnh đại diện (đường dẫn)", "Avatar image URL")}
                type="url"
                value={form.avatar_url}
                onChange={(event) => updateField("avatar_url", event.target.value)}
                placeholder="https://..."
                hint={tr(
                  "Để trống nếu bạn muốn dùng ảnh mặc định.",
                  "Leave empty to use the default picture.",
                )}
                error={avatarBroken && form.avatar_url ? tr("Không hiển thị được ảnh từ đường dẫn này.", "This image could not be displayed.") : undefined}
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={handleSaveProfile} loading={status === "loading"}>
              {tr("Lưu thay đổi", "Save changes")}
            </Button>
            <LanguageToggle />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card variant="default" padding="lg" className="rounded-xl">
          <p className="text-overline text-leaf-strong">{tr("Bảo mật", "Security")}</p>
          <h3 className="mt-2 text-h2 font-bold text-ink">
            {account?.has_usable_password ? tr("Đổi mật khẩu", "Change password") : tr("Tạo mật khẩu đăng nhập", "Create a sign-in password")}
          </h3>
          <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-ink-soft">
            {account?.has_usable_password
              ? tr(
                  "Nhập mật khẩu hiện tại để xác nhận đây là bạn, rồi chọn mật khẩu mới.",
                  "Enter your current password to confirm it's you, then choose a new one.",
                )
              : tr(
                  "Tài khoản này đang đăng nhập bằng Google. Tạo thêm mật khẩu để có thể đăng nhập bằng email.",
                  "This account signs in with Google. Create a password so you can also sign in by email.",
                )}
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 grid gap-5 md:grid-cols-2">
            {account?.has_usable_password ? (
              <div className="md:col-span-2">
                <PasswordInput
                  tone="light"
                  label={tr("Mật khẩu hiện tại", "Current password")}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
            ) : null}
            <PasswordInput
              tone="light"
              label={tr("Mật khẩu mới", "New password")}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={tr("Tối thiểu 8 ký tự", "At least 8 characters")}
              required
            />
            <PasswordInput
              tone="light"
              label={tr("Xác nhận mật khẩu mới", "Confirm new password")}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <div className="md:col-span-2">
              <Button type="submit" variant="secondary" loading={changingPassword}>
                <KeyRound size={17} aria-hidden />{" "}
                {account?.has_usable_password ? tr("Đổi mật khẩu", "Change password") : tr("Tạo mật khẩu", "Create password")}
              </Button>
            </div>
          </form>
        </Card>

        <Card variant="default" padding="lg" className="rounded-xl">
          <p className="text-overline text-leaf-strong">{tr("Tùy chọn", "Preferences")}</p>
          <h3 className="mt-2 text-h2 font-bold text-ink">{tr("Cách Agromind AI làm việc với bạn", "How Agromind AI works with you")}</h3>
          <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-ink-soft">
            {tr("Các lựa chọn dưới đây được lưu ngay khi bạn thay đổi.", "The options below are saved as soon as you change them.")}
          </p>

          {settings ? (
            <div className="mt-5 space-y-3">
              {(
                [
                  {
                    key: "email_notifications" as const,
                    label: tr("Nhận email nhắc việc chăm sóc", "Email me care reminders"),
                  },
                  {
                    key: "push_notifications" as const,
                    label: tr("Nhận thông báo trên thiết bị", "Send notifications to my device"),
                  },
                  {
                    key: "diagnosis_auto_save" as const,
                    label: tr("Tự động lưu kết quả kiểm tra lá", "Save leaf check results automatically"),
                  },
                  {
                    key: "expert_chat_enabled" as const,
                    label: tr("Bật chat tư vấn nông nghiệp", "Enable the agriculture advisory chat"),
                  },
                  {
                    key: "marketing_opt_in" as const,
                    label: tr("Nhận tin về tính năng và ưu đãi mới", "Send me news about new features and offers"),
                  },
                ]
              ).map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-start gap-3 rounded-[var(--r-md)] border border-line bg-surface-soft p-4"
                >
                  <input
                    type="checkbox"
                    checked={settings[option.key]}
                    disabled={savingSettings}
                    onChange={(event) => void saveSettings({ [option.key]: event.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--leaf)]"
                  />
                  <span className="text-body-sm leading-6 text-ink">{option.label}</span>
                </label>
              ))}

              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-timezone" className="text-sm font-medium text-ink">
                    {tr("Múi giờ nhắc việc", "Reminder time zone")}
                  </label>
                  <select
                    id="settings-timezone"
                    value={settings.timezone}
                    disabled={savingSettings}
                    onChange={(event) => void saveSettings({ timezone: event.target.value })}
                    className="h-11 w-full rounded-md border border-line bg-surface-soft px-3.5 text-[15px] text-ink outline-none transition-all duration-180 focus:border-leaf focus:bg-surface focus:shadow-focus"
                  >
                    {TIMEZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-language" className="text-sm font-medium text-ink">
                    {tr("Ngôn ngữ hiển thị", "Display language")}
                  </label>
                  <select
                    id="settings-language"
                    value={settings.language === "en" ? "en" : "vi"}
                    disabled={savingSettings}
                    onChange={(event) => void saveSettings({ language: event.target.value })}
                    className="h-11 w-full rounded-md border border-line bg-surface-soft px-3.5 text-[15px] text-ink outline-none transition-all duration-180 focus:border-leaf focus:bg-surface focus:shadow-focus"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-body-sm text-ink-soft">
              {tr("Chưa tải được tùy chọn của bạn.", "Your preferences could not be loaded.")}
            </p>
          )}
        </Card>
      </div>

      <Card variant="default" padding="lg" className="rounded-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-overline text-leaf-strong">{tr("Gói dịch vụ", "Service plans")}</p>
            <h3 className="mt-2 text-h2 font-bold text-ink">{tr("Chọn mức sử dụng phù hợp", "Choose the plan that fits you")}</h3>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-ink-soft">
              {tr("So sánh quyền lợi và chuyển đến bước xác nhận trước khi thay đổi gói.", "Compare benefits and continue to confirmation before changing your plan.")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {plans.map((plan) => (
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

      <Card variant="default" padding="lg" className="rounded-xl border-danger/30">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-ink">
            <ShieldAlert size={21} aria-hidden />
          </span>
          <div>
            <p className="text-overline text-danger-ink">{tr("Vùng nguy hiểm", "Danger zone")}</p>
            <h3 className="mt-2 text-h2 font-bold text-ink">{tr("Xóa tài khoản", "Delete account")}</h3>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-ink-soft">
              {tr(
                "Xóa tài khoản là hành động không thể hoàn tác. Toàn bộ kết quả kiểm tra lá, lô vườn, nhật ký, kế hoạch trồng và mã QR truy xuất của bạn sẽ bị xóa vĩnh viễn.",
                "Deleting your account cannot be undone. Every leaf check result, plot, log, crop plan and traceability QR code of yours is permanently removed.",
              )}
            </p>
            <Button variant="danger" className="mt-5" onClick={() => void openDeleteDialog()}>
              <Trash2 size={17} aria-hidden /> {tr("Xóa tài khoản của tôi", "Delete my account")}
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={tr("Xóa tài khoản vĩnh viễn?", "Permanently delete your account?")}
        description={tr(
          "Hành động này không thể hoàn tác và sẽ xóa cùng lúc mọi dữ liệu dưới đây.",
          "This cannot be undone and removes everything listed below at the same time.",
        )}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <ul className="grid gap-2 rounded-lg border border-line bg-surface-soft p-4 text-body-sm text-ink-soft sm:grid-cols-2">
            {deletionRows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3">
                <span>{row.label}</span>
                <span className="font-semibold text-ink">{row.count ?? "—"}</span>
              </li>
            ))}
          </ul>

          <p className="text-body-sm leading-relaxed text-ink-soft">
            {tr(
              "Mọi trang truy xuất QR đã in sẽ ngừng hoạt động ngay lập tức. Lịch sử thanh toán cũng bị xóa và không thể yêu cầu lại.",
              "Any printed traceability QR page stops working immediately. Payment history is deleted too and cannot be requested back.",
            )}
          </p>

          {account?.has_usable_password ? (
            <PasswordInput
              tone="light"
              label={tr("Mật khẩu của bạn", "Your password")}
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          ) : null}

          <Input
            tone="light"
            label={tr(`Nhập "${confirmPhrase}" để xác nhận`, `Type "${confirmPhrase}" to confirm`)}
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder={confirmPhrase}
          />

          {deleteError ? (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
              {deleteError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteConfirmText.trim().toUpperCase() !== confirmPhrase}
              onClick={() => void handleDeleteAccount()}
            >
              <Trash2 size={17} aria-hidden /> {tr("Tôi hiểu, xóa tài khoản", "I understand, delete my account")}
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {tr("Giữ tài khoản", "Keep my account")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
