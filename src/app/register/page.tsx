"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/store/session-store";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, status, error, clearError } = useSessionStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  async function handleRegister() {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError("Vui lòng nhập email.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Xác nhận mật khẩu không khớp.");
      return;
    }
    await register({ email, password });
    router.push("/dashboard");
  }

  return (
    <main id="main-content" className="min-h-screen bg-ink-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-stretch">
        <Card variant="light" padding="lg" className="relative overflow-hidden shadow-md">
          <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-60" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <p className="text-overline text-leaf-700">Tạo tài khoản</p>
                <h1 className="mt-1 text-h2 text-ink-900">Bắt đầu với Agromind AI</h1>
              </div>
            </div>

            <Link
              href="/login"
              className="rounded-md border border-border-light bg-white px-3 py-2 text-body-sm font-medium text-ink-700 transition hover:bg-leaf-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
            >
              Đã có tài khoản
            </Link>
          </div>

          <div className="relative mt-8 space-y-4">
            <Input
              tone="light"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                clearError();
                setLocalError(null);
                setEmail(e.target.value);
              }}
              placeholder="vd: nongdan@agromindai.vn"
            />
            <Input
              tone="light"
              label="Mật khẩu"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                clearError();
                setLocalError(null);
                setPassword(e.target.value);
              }}
              placeholder="Tối thiểu 8 ký tự"
            />
            <Input
              tone="light"
              label="Xác nhận mật khẩu"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                clearError();
                setLocalError(null);
                setConfirmPassword(e.target.value);
              }}
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          {localError || error ? (
            <div
              role="alert"
              className="relative mt-5 rounded-md border border-amber-200/80 bg-amber-50 px-4 py-3 text-body text-amber-950"
            >
              {localError || error}
            </div>
          ) : null}

          <div className="relative mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" loading={status === "loading"} type="button" onClick={handleRegister}>
              <UserRoundPlus strokeWidth={1.75} className="h-4 w-4" aria-hidden />
              Tạo tài khoản
              <ArrowRight strokeWidth={1.75} className="h-4 w-4" aria-hidden />
            </Button>

            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border-light px-5 text-body font-medium text-ink-700 transition hover:bg-leaf-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/40"
            >
              Về trang chủ
            </Link>
          </div>
        </Card>

        <Card
          variant="dark"
          padding="lg"
          className="relative overflow-hidden border-border-dark bg-app text-on-dark"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(232,241,235,0.12) 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-80" aria-hidden />
          <div className="relative">
            <p className="text-overline text-muted-on-dark">Tài khoản người dùng</p>
            <h2 className="mt-3 text-h2 text-on-dark">Chỉ cần email và mật khẩu</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-muted-on-dark">
              Hệ thống sẽ tạo danh tính nội bộ, lưu cài đặt mặc định và gắn lịch sử chẩn đoán vào
              tài khoản của bạn ngay sau khi đăng ký.
            </p>

            <ul className="mt-6 space-y-3 text-body-sm text-muted-on-dark">
              <li className="flex gap-2">
                <span className="text-leaf-300" aria-hidden>
                  ·
                </span>
                Mỗi tài khoản có bộ cài đặt riêng.
              </li>
              <li className="flex gap-2">
                <span className="text-leaf-300" aria-hidden>
                  ·
                </span>
                Lịch sử chẩn đoán và chat gắn với email đăng ký.
              </li>
              <li className="flex gap-2">
                <span className="text-leaf-300" aria-hidden>
                  ·
                </span>
                Bạn có thể nâng cấp gói dịch vụ sau khi đăng nhập.
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </main>
  );
}
