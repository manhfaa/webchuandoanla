"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useSessionStore } from "@/store/session-store";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
              locale?: string;
            },
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated, status, error, clearError } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (isAuthenticated) window.location.replace(nextPath);
  }, [isAuthenticated, nextPath]);

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get("next");
    if (candidate?.startsWith("/dashboard")) setNextPath(candidate);
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const buttonElement = googleButtonRef.current;
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-identity]");

    const initializeGoogle = () => {
      if (!window.google) return;
      buttonElement.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          if (!response.credential) {
            setGoogleError("Google chưa xác nhận được tài khoản. Vui lòng thử lại.");
            return;
          }

          try {
            clearError();
            setGoogleError(null);
            await loginWithGoogle({ credential: response.credential });
            window.location.assign(nextPath);
          } catch {
            // The session store provides a user-facing message below.
          }
        },
      });
      window.google.accounts.id.renderButton(buttonElement, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: Math.min(420, buttonElement.clientWidth || 420),
        locale: "vi",
      });
    };

    if (existingScript) {
      if (window.google) initializeGoogle();
      else existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = initializeGoogle;
    script.onerror = () => setGoogleError("Chưa thể mở đăng nhập Google. Vui lòng dùng email hoặc thử lại sau.");
    document.head.appendChild(script);

    return () => window.google?.accounts.id.cancel();
  }, [clearError, googleClientId, loginWithGoogle, nextPath]);

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
      eyebrow="Truy cập tài khoản"
      title="Tiếp tục theo dõi khu vườn của bạn"
      description="Đăng nhập để xem lại ảnh lá, kết quả cần chú ý và các kế hoạch chăm sóc đã lưu."
      asideTitle="Từ một chiếc lá, theo dõi cả quá trình chăm sóc."
      asideDescription="Agromind AI sắp xếp kết quả kiểm tra, điều kiện vườn và việc nên làm trong một không gian dễ theo dõi."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {googleClientId ? (
          <div className="rounded-lg border border-line bg-surface-soft p-4">
            <p className="text-sm font-semibold text-ink">Tiếp tục nhanh bằng Google</p>
            <div ref={googleButtonRef} className="mt-3 min-h-11 w-full overflow-hidden rounded-md" />
            {googleError ? <p role="alert" className="mt-3 text-xs leading-6 text-danger-ink">{googleError}</p> : null}
            <div className="mt-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              <span className="h-px flex-1 bg-line" aria-hidden />
              Hoặc dùng email
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>
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
          label="Mật khẩu"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            clearError();
            setPassword(event.target.value);
          }}
          placeholder="Nhập mật khẩu"
          required
        />

        {error ? (
          <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
            {error}
          </div>
        ) : null}

        <Button size="lg" loading={status === "loading"} type="submit" className="w-full">
          <LockKeyhole size={17} aria-hidden /> Đăng nhập <ArrowRight size={17} aria-hidden />
        </Button>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
          <span className="text-ink-soft">Chưa có tài khoản?</span>
          <Link href="/register" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Tạo tài khoản
          </Link>
        </div>
      </form>

      <p className="mt-6 text-xs leading-6 text-ink-soft">
        Nếu quên mật khẩu, hãy liên hệ quản trị viên hỗ trợ tài khoản.
      </p>
    </AuthShell>
  );
}
