"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brand } from "@/constants/brand";
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
    if (!isAuthenticated) return;
    window.location.replace(nextPath);
  }, [isAuthenticated, nextPath]);

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get("next");
    if (candidate && candidate.startsWith("/dashboard")) {
      setNextPath(candidate);
    }
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const buttonEl = googleButtonRef.current;
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-identity]");

    const initializeGoogle = () => {
      if (!window.google || !buttonEl) return;
      buttonEl.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          if (!response.credential) {
            setGoogleError("Google không trả về mã xác thực. Vui lòng thử lại.");
            return;
          }

          try {
            clearError();
            setGoogleError(null);
            await loginWithGoogle({ credential: response.credential });
            window.location.assign(nextPath);
          } catch {
            // The store exposes the backend error for the alert below.
          }
        },
      });
      window.google.accounts.id.renderButton(buttonEl, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: Math.min(360, buttonEl.clientWidth || 360),
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
    script.onerror = () => setGoogleError("Không tải được đăng nhập Google. Vui lòng thử lại sau.");
    document.head.appendChild(script);

    return () => {
      window.google?.accounts.id.cancel();
    };
  }, [clearError, googleClientId, loginWithGoogle, nextPath]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await login({ email, password });
      window.location.assign(nextPath);
    } catch {
      // The store exposes the backend error for the alert below.
    }
  }

  return (
    <main id="main-content" className="min-h-screen bg-ink-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-stretch">
        <Card variant="dark" padding="lg" className="relative overflow-hidden border-border-dark bg-app text-on-dark">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(232,241,235,0.14) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" aria-hidden />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-center justify-between gap-4">
              <Logo dark />
              <Link
                href="/"
                className="rounded-md border border-border-dark px-3 py-2 text-body-sm font-medium text-muted-on-dark transition hover:bg-white/5 hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
              >
                Về trang chủ
              </Link>
            </div>

            <div>
              <p className="text-overline text-muted-on-dark">Đăng nhập</p>
              <h1 className="mt-3 text-display text-on-dark">Chào mừng trở lại Agromind AI</h1>
              <p className="mt-4 max-w-md text-body-lg text-muted-on-dark">
                {brand.slogan} Đăng nhập để đồng bộ lịch sử kiểm tra, hồ sơ và dữ liệu chăm sóc cây.
              </p>
            </div>

            <ul className="space-y-3 text-body-sm text-muted-on-dark">
              <li className="flex gap-2">
                <span className="text-leaf-300" aria-hidden>·</span>
                Phiên đăng nhập an toàn, dữ liệu được gắn với tài khoản của bạn.
              </li>
              <li className="flex gap-2">
                <span className="text-leaf-300" aria-hidden>·</span>
                Mỗi chẩn đoán được gắn với tài khoản của bạn.
              </li>
              <li className="flex gap-2">
                <span className="text-leaf-300" aria-hidden>·</span>
                Khu quản lý chỉ mở khi bạn đã đăng nhập hợp lệ.
              </li>
            </ul>
          </div>
        </Card>

        <Card variant="light" padding="lg" className="flex flex-col justify-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-leaf-100 text-leaf-700">
              <ShieldCheck strokeWidth={1.75} className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-overline text-leaf-700">Truy cập an toàn</p>
              <h2 className="mt-1 text-h2 text-ink-900">Đăng nhập tài khoản</h2>
            </div>
          </div>

          <form className="mt-8" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-leaf-100 bg-leaf-50/70 p-4">
              <p className="text-body-sm font-semibold text-ink-900">Đăng nhập nhanh bằng Google</p>
              <div ref={googleButtonRef} className="mt-3 min-h-10 w-full" />
              {!googleClientId ? (
                <p className="mt-3 text-caption text-amber-700">
                  Chưa cấu hình Google Client ID cho website.
                </p>
              ) : null}
              {googleError ? <p className="mt-3 text-caption text-amber-700">{googleError}</p> : null}
            </div>

            <div className="my-6 flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.16em] text-ink-400">
              <span className="h-px flex-1 bg-border-light" />
              Hoặc dùng email
              <span className="h-px flex-1 bg-border-light" />
            </div>

            <div className="space-y-4">
              <Input
                tone="light"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  clearError();
                  setEmail(event.target.value);
                }}
                placeholder="vd: user@example.com"
              />
              <Input
                tone="light"
                label="Mật khẩu"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  clearError();
                  setPassword(event.target.value);
                }}
                placeholder="Nhập mật khẩu"
              />
            </div>

            {error ? (
              <div role="alert" className="mt-5 rounded-md border border-amber-200/80 bg-amber-50 px-4 py-3 text-body text-amber-950">
                {error}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" loading={status === "loading"} type="submit">
                Vào dashboard
                <ArrowRight strokeWidth={1.75} className="h-4 w-4" aria-hidden />
              </Button>

              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border-light bg-leaf-50 px-5 text-body font-medium text-ink-900 transition hover:bg-leaf-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
              >
                Tạo tài khoản
              </Link>
            </div>
          </form>

          <p className="mt-6 text-caption text-ink-500">
            Nếu quên mật khẩu, liên hệ quản trị viên để được hỗ trợ đặt lại.
          </p>
        </Card>
      </div>
    </main>
  );
}
