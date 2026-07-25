"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { djangoConfirmPasswordReset } from "@/lib/django-client";
import { useSessionStore } from "@/store/session-store";
import { useTr } from "@/lib/use-tr";

export default function ResetPasswordPage() {
  const tr = useTr();
  const adoptSession = useSessionStore((state) => state.adoptSession);
  // Read from the URL after mount rather than useSearchParams, so the page can
  // stay statically rendered like the other auth screens.
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
    setTokenChecked(true);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (password.length < 8) {
      return setError(tr("Mật khẩu phải có ít nhất 8 ký tự.", "Password must be at least 8 characters."));
    }
    if (password !== confirmPassword) {
      return setError(tr("Xác nhận mật khẩu chưa khớp.", "Password confirmation does not match."));
    }

    setSaving(true);
    try {
      const result = await djangoConfirmPasswordReset({ token, newPassword: password });
      await adoptSession({ access: result.access, refresh: result.refresh });
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Chưa đặt lại được mật khẩu.", "Could not reset the password."));
      setSaving(false);
    }
  }

  return (
    <AuthShell
      eyebrow={tr("Khôi phục tài khoản", "Account recovery")}
      title={tr("Đặt mật khẩu mới", "Set a new password")}
      description={tr(
        "Chọn một mật khẩu mới cho tài khoản của bạn. Sau khi đổi, bạn sẽ được đưa thẳng vào khu vườn.",
        "Choose a new password for your account. Once it is set, you'll go straight to your garden.",
      )}
      asideTitle={tr("Một mật khẩu mới, mọi dữ liệu vẫn nguyên vẹn.", "A new password, with all your data intact.")}
      asideDescription={tr(
        "Lịch sử kiểm tra lá, lô vườn và kế hoạch chăm sóc của bạn không thay đổi khi đổi mật khẩu.",
        "Your leaf check history, plots and care plans are untouched when you change your password.",
      )}
    >
      {tokenChecked && !token ? (
        <div className="space-y-5">
          <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
            {tr(
              "Liên kết đặt lại mật khẩu không hợp lệ. Hãy yêu cầu một liên kết mới.",
              "This password reset link is not valid. Please request a new one.",
            )}
          </div>
          <Link href="/forgot-password" className={buttonVariants({ variant: "primary" })}>
            {tr("Yêu cầu liên kết mới", "Request a new link")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordInput
            label={tr("Mật khẩu mới", "New password")}
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setError(null);
              setPassword(event.target.value);
            }}
            placeholder={tr("Tối thiểu 8 ký tự", "At least 8 characters")}
            hint={tr("Nên dùng chữ hoa, chữ thường, số và ký tự đặc biệt.", "Use uppercase, lowercase, numbers and special characters.")}
            required
          />
          <PasswordInput
            label={tr("Xác nhận mật khẩu mới", "Confirm new password")}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setError(null);
              setConfirmPassword(event.target.value);
            }}
            placeholder={tr("Nhập lại mật khẩu mới", "Re-enter the new password")}
            required
          />

          {error ? (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
              {error}
            </div>
          ) : null}

          <Button size="lg" type="submit" loading={saving} disabled={!tokenChecked} className="w-full">
            <KeyRound size={17} aria-hidden /> {tr("Đặt lại mật khẩu", "Reset password")}
          </Button>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
            <span className="text-ink-soft">{tr("Liên kết đã hết hạn?", "Link expired?")}</span>
            <Link href="/forgot-password" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {tr("Yêu cầu liên kết mới", "Request a new link")}
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
