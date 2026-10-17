"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton, useGoogleSignInAvailability } from "@/components/auth/google-sign-in";
import { TermsConsentCheckbox } from "@/components/auth/terms-consent";
import { Turnstile } from "@/components/auth/turnstile";
import { buttonVariants } from "@/components/ui/button";
import { useSessionStore } from "@/store/session-store";
import { useTr } from "@/lib/use-tr";

export default function RegisterPage() {
  const tr = useTr();
  const router = useRouter();
  const { loginWithGoogle, isAuthenticated, error, clearError } = useSessionStore();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const { clientId: googleClientId, available: googleAvailable } = useGoogleSignInAvailability();

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  async function handleGoogleCredential(credential: string) {
    if (!acceptedTerms || !turnstileToken) {
      setGoogleError(tr("Hãy đồng ý điều khoản và hoàn tất xác minh an toàn.", "Accept the terms and complete the security check."));
      return;
    }
    try {
      clearError();
      setGoogleError(null);
      await loginWithGoogle({ credential, acceptedTerms, turnstileToken });
      router.push("/dashboard");
    } catch {
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
    }
  }

  return (
    <AuthShell
      eyebrow={tr("Tạo tài khoản", "Create account")}
      title={tr("Bắt đầu theo dõi sức khỏe cây trồng", "Start tracking your plants' health")}
      description={tr(
        "Tiếp tục bằng Google để tạo tài khoản an toàn, lưu kết quả kiểm tra và kế hoạch chăm sóc của bạn.",
        "Continue with Google to create a secure account and save your check results and care plans.",
      )}
      asideTitle={tr("Mỗi lần kiểm tra trở thành một dấu mốc của khu vườn.", "Every check becomes a milestone for your garden.")}
      asideDescription={tr(
        "Lưu ảnh và kết quả theo thời gian giúp bạn nhận ra thay đổi sớm hơn, thay vì chỉ xem một lần rồi quên.",
        "Saving photos and results over time helps you spot changes earlier, instead of checking once and forgetting.",
      )}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-line bg-surface-soft p-5">
          <div className="flex items-start gap-3">
            <UserRoundPlus className="mt-0.5 shrink-0 text-leaf-strong" size={22} aria-hidden />
            <div>
              <h2 className="font-semibold text-ink">{tr("Tạo tài khoản bằng Google", "Create your account with Google")}</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {tr("Agromind AI chỉ dùng Google để xác nhận tài khoản; kết quả kiểm tra vẫn được lưu riêng trong Agromind AI.",
                  "Google confirms your identity; your check results remain in Agromind AI.")}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <TermsConsentCheckbox
              checked={acceptedTerms}
              onChange={(checked) => {
                clearError();
                setGoogleError(null);
                setAcceptedTerms(checked);
              }}
            />
          </div>
          <Turnstile onToken={setTurnstileToken} resetKey={turnstileResetKey} />

          {googleAvailable && googleClientId && acceptedTerms && turnstileToken ? (
            <GoogleSignInButton
              clientId={googleClientId}
              text="signup_with"
              onCredential={(credential) => void handleGoogleCredential(credential)}
              onError={setGoogleError}
            />
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink-soft">
              {!googleAvailable || !googleClientId
                ? tr("Đăng ký bằng Google hiện chưa sẵn sàng. Vui lòng thử lại sau.", "Google registration is not available yet. Please try again later.")
                : tr("Đồng ý điều khoản và hoàn tất xác minh để tiếp tục.", "Accept the terms and complete the security check to continue.")}
            </p>
          )}
        </div>

        {googleError || error ? (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            {googleError || error}
          </p>
        ) : null}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
          <span className="text-ink-soft">{tr("Đã có tài khoản?", "Already have an account?")}</span>
          <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            {tr("Đăng nhập", "Sign in")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
