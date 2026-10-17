"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { Turnstile } from "@/components/auth/turnstile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { djangoResendVerification, djangoVerifyEmail } from "@/lib/django-client";
import { useTr } from "@/lib/use-tr";

function VerificationContent() {
  const tr = useTr();
  const params = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [challenge, setChallenge] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(Boolean(token));
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    void djangoVerifyEmail(token)
      .then((result) => {
        setMessage(result.detail);
        setVerified(true);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Liên kết không hợp lệ."))
      .finally(() => setBusy(false));
  }, [token]);

  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setBusy(true);
    try {
      const result = await djangoResendVerification(email, challenge);
      setMessage(result.detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được liên kết. Vui lòng thử lại.");
    } finally {
      setBusy(false);
      setChallenge("");
      setResetKey((value) => value + 1);
    }
  }

  return (
    <AuthShell
      eyebrow={tr("Xác minh email", "Verify email")}
      title={tr("Kích hoạt tài khoản", "Activate your account")}
      description={tr("Mở liên kết trong email để bảo vệ tài khoản của bạn.", "Open the link in your email to protect your account.")}
      asideTitle={tr("Bắt đầu an toàn từ bước đầu tiên.", "Start securely from the first step.")}
      asideDescription={tr("Chỉ email đã xác minh mới có thể đăng nhập và sử dụng lượt kiểm tra.", "Only verified email accounts can sign in and use diagnosis credits.")}
    >
      <div className="space-y-5">
        {busy && token && !message ? <p role="status">{tr("Đang xác minh email...", "Verifying email...")}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-line bg-surface-soft p-4 text-ink">{message}</p> : null}
        {verified ? (
          <Link href="/login" className={buttonVariants({ size: "lg" })}>{tr("Đăng nhập", "Sign in")}</Link>
        ) : (
          <form onSubmit={resend} className="space-y-4">
            <p className="text-sm text-ink-soft">{tr("Chưa nhận được liên kết hoặc liên kết đã hết hạn?", "Didn't receive a link or has it expired?")}</p>
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Turnstile onToken={setChallenge} resetKey={resetKey} />
            <Button type="submit" loading={busy} disabled={!challenge || !email} className="w-full">
              {tr("Gửi lại liên kết", "Resend link")}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerificationContent /></Suspense>;
}
