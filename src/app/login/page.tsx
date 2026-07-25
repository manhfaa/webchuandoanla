"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleSignInButton, useGoogleSignInAvailability } from "@/components/auth/google-sign-in";
import { TermsConsentCheckbox } from "@/components/auth/terms-consent";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { DjangoApiError } from "@/lib/django-client";
import { useSessionStore } from "@/store/session-store";
import { useTr } from "@/lib/use-tr";

export default function LoginPage() {
  const tr = useTr();
  const { login, loginWithGoogle, isAuthenticated, status, error, clearError } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [googleError, setGoogleError] = useState<string | null>(null);
  // A Google identity with no account yet has to agree to the terms first; the
  // credential is held so the user does not have to pick their account again.
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [googleConsent, setGoogleConsent] = useState(false);
  const [googleConsentNotice, setGoogleConsentNotice] = useState<string | null>(null);
  const { clientId: googleClientId, available: googleAvailable } = useGoogleSignInAvailability();

  useEffect(() => {
    if (isAuthenticated) window.location.replace(nextPath);
  }, [isAuthenticated, nextPath]);

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get("next");
    if (candidate?.startsWith("/dashboard")) setNextPath(candidate);
  }, []);

  async function signInWithGoogle(credential: string, acceptedTerms: boolean) {
    try {
      clearError();
      setGoogleError(null);
      await loginWithGoogle({ credential, acceptedTerms });
      window.location.assign(nextPath);
    } catch (err) {
      const consentMessage = err instanceof DjangoApiError ? err.fieldErrors.accepted_terms : undefined;
      if (consentMessage) {
        // Not a failure the user needs to see twice: the consent step below
        // explains it, so drop the store's duplicate error banner.
        clearError();
        setPendingGoogleCredential(credential);
        setGoogleConsentNotice(consentMessage);
        return;
      }
      // The session store provides a user-facing message below.
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await login({ email, password });
      window.location.assign(nextPath);
    } catch {
      // The session store provides a user-facing message below.
    }
  }

  return (
    <AuthShell
      eyebrow={tr("Truy cập tài khoản", "Account access")}
      title={tr("Tiếp tục theo dõi khu vườn của bạn", "Keep tracking your garden")}
      description={tr("Đăng nhập để xem lại ảnh lá, kết quả cần chú ý và các kế hoạch chăm sóc đã lưu.", "Sign in to revisit leaf photos, results that need attention and your saved care plans.")}
      asideTitle={tr("Từ một chiếc lá, theo dõi cả quá trình chăm sóc.", "From a single leaf, follow the whole care journey.")}
      asideDescription={tr("Agromind AI sắp xếp kết quả kiểm tra, điều kiện vườn và việc nên làm trong một không gian dễ theo dõi.", "Agromind AI organizes check results, garden conditions and next steps in one easy-to-follow space.")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {googleAvailable && googleClientId ? (
          <div className="rounded-lg border border-line bg-surface-soft p-4">
            <p className="text-sm font-semibold text-ink">{tr("Tiếp tục nhanh bằng Google", "Continue quickly with Google")}</p>
            {pendingGoogleCredential ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-6 text-ink-soft">{googleConsentNotice}</p>
                <TermsConsentCheckbox checked={googleConsent} onChange={setGoogleConsent} required={false} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!googleConsent}
                  loading={status === "loading"}
                  onClick={() => void signInWithGoogle(pendingGoogleCredential, true)}
                >
                  {tr("Đồng ý và tiếp tục bằng Google", "Agree and continue with Google")}
                </Button>
              </div>
            ) : (
              <GoogleSignInButton
                clientId={googleClientId}
                onCredential={(credential) => void signInWithGoogle(credential, false)}
                onError={setGoogleError}
              />
            )}
            {googleError ? <p role="alert" className="mt-3 text-xs leading-6 text-danger-ink">{googleError}</p> : null}
            <AuthDivider />
          </div>
        ) : null}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            clearError();
            setEmail(event.target.value);
          }}
          placeholder="tenban@example.com"
          required
        />
        <PasswordInput
          label={tr("Mật khẩu", "Password")}
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            clearError();
            setPassword(event.target.value);
          }}
          placeholder={tr("Nhập mật khẩu", "Enter password")}
          required
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-leaf-strong underline underline-offset-2 hover:text-leaf">
            {tr("Quên mật khẩu?", "Forgot your password?")}
          </Link>
        </div>

        {error ? (
          <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
            {error}
          </div>
        ) : null}

        <Button size="lg" loading={status === "loading"} type="submit" className="w-full">
          <LockKeyhole size={17} aria-hidden /> {tr("Đăng nhập", "Sign in")} <ArrowRight size={17} aria-hidden />
        </Button>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
          <span className="text-ink-soft">{tr("Chưa có tài khoản?", "Don't have an account?")}</span>
          <Link href="/register" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            {tr("Tạo tài khoản", "Create account")}
          </Link>
        </div>
      </form>

      <p className="mt-6 text-xs leading-6 text-ink-soft">
        {tr(
          "Không nhận được email đặt lại mật khẩu? Hãy kiểm tra mục spam, hoặc liên hệ quản trị viên hỗ trợ tài khoản.",
          "No password reset email? Check your spam folder, or contact the administrator for account support.",
        )}
      </p>
    </AuthShell>
  );
}
