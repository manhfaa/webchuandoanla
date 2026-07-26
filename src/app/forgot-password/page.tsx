"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MailCheck, SendHorizontal, TriangleAlert } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { djangoRequestPasswordReset } from "@/lib/django-client";
import { useTr } from "@/lib/use-tr";

export default function ForgotPasswordPage() {
  const tr = useTr();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const result = await djangoRequestPasswordReset(email.trim());
      // The backend is the authority on whether a link can actually be
      // delivered; it also sends the sentence to show when it cannot.
      setUnavailable(result.delivery_enabled === false ? result.detail : null);
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Chưa gửi được yêu cầu. Vui lòng thử lại.", "Could not send the request. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell
      eyebrow={tr("Khôi phục tài khoản", "Account recovery")}
      title={tr("Quên mật khẩu?", "Forgot your password?")}
      description={tr(
        "Nhập email bạn dùng để đăng nhập. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu, có hiệu lực trong 2 giờ.",
        "Enter the email you sign in with. We'll send a reset link that stays valid for 2 hours.",
      )}
      asideTitle={tr("Mất mật khẩu không có nghĩa là mất khu vườn.", "Losing your password does not mean losing your garden.")}
      asideDescription={tr(
        "Toàn bộ ảnh lá, kết quả kiểm tra và kế hoạch chăm sóc vẫn nằm nguyên trong tài khoản của bạn.",
        "All your leaf photos, check results and care plans stay exactly where you left them.",
      )}
    >
      {sentTo && unavailable ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-sun-soft p-4">
            <TriangleAlert size={20} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">{tr("Chưa gửi được email", "Email not available")}</p>
              {/* Shown verbatim from the backend so the reason cannot drift out
                  of step with what the server can actually do. */}
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                {tr(unavailable, "Password reset by email is not enabled yet. If you can still sign in, change your password on the Profile page. Otherwise please contact the administrator for help.")}
              </p>
            </div>
          </div>
          <Link href="/login" className={buttonVariants({ variant: "primary" })}>
            {tr("Quay lại đăng nhập", "Back to sign in")} <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      ) : sentTo ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-leaf/30 bg-surface-soft p-4">
            <MailCheck size={20} className="mt-0.5 shrink-0 text-leaf-strong" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">{tr("Đã gửi yêu cầu", "Request sent")}</p>
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                {tr(
                  `Nếu ${sentTo} có tài khoản Agromind AI, liên kết đặt lại mật khẩu đang trên đường tới hộp thư của bạn. Hãy kiểm tra cả mục spam.`,
                  `If ${sentTo} has an Agromind AI account, a reset link is on its way to that inbox. Remember to check your spam folder.`,
                )}
              </p>
            </div>
          </div>
          <p className="text-xs leading-6 text-ink-soft">
            {tr(
              "Liên kết chỉ dùng được một lần và hết hạn sau 2 giờ. Nếu yêu cầu lại, liên kết cũ sẽ ngừng hoạt động.",
              "The link works once and expires after 2 hours. Requesting a new one deactivates the previous link.",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setSentTo(null)}>
              {tr("Gửi lại", "Send again")}
            </Button>
            <Link href="/login" className={buttonVariants({ variant: "primary" })}>
              {tr("Quay lại đăng nhập", "Back to sign in")} <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setError(null);
              setEmail(event.target.value);
            }}
            placeholder="tenban@example.com"
            required
          />

          {error ? (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
              {error}
            </div>
          ) : null}

          <Button size="lg" type="submit" loading={sending} className="w-full">
            <SendHorizontal size={17} aria-hidden /> {tr("Gửi liên kết đặt lại", "Send reset link")}
          </Button>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
            <span className="text-ink-soft">{tr("Nhớ ra mật khẩu rồi?", "Remembered your password?")}</span>
            <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {tr("Đăng nhập", "Sign in")}
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
