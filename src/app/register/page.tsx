"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useSessionStore } from "@/store/session-store";
import { useTr } from "@/lib/use-tr";

export default function RegisterPage() {
  const tr = useTr();
  const router = useRouter();
  const { register, isAuthenticated, status, error, clearError } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (!email.trim()) return setLocalError("Vui lòng nhập email.");
    if (password.length < 8) return setLocalError("Mật khẩu phải có ít nhất 8 ký tự.");
    if (password !== confirmPassword) return setLocalError("Xác nhận mật khẩu chưa khớp.");

    try {
      await register({ email, password });
      router.push("/dashboard");
    } catch {
      // The session store provides a user-facing message below.
    }
  }

  function clearMessages() {
    clearError();
    setLocalError(null);
  }

  return (
    <AuthShell
      eyebrow={tr("Tạo tài khoản", "Create account")}
      title={tr("Bắt đầu theo dõi sức khỏe cây trồng", "Start tracking your plants' health")}
      description={tr("Chỉ cần email và mật khẩu để lưu kết quả kiểm tra, vị trí vườn và kế hoạch chăm sóc của bạn.", "Just an email and password to save your check results, garden location and care plans.")}
      asideTitle={tr("Mỗi lần kiểm tra trở thành một dấu mốc của khu vườn.", "Every check becomes a milestone for your garden.")}
      asideDescription={tr("Lưu ảnh và kết quả theo thời gian giúp bạn nhận ra thay đổi sớm hơn, thay vì chỉ xem một lần rồi quên.", "Saving photos and results over time helps you spot changes earlier, instead of checking once and forgetting.")}
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            clearMessages();
            setEmail(event.target.value);
          }}
          placeholder="tenban@example.com"
          required
        />
        <PasswordInput
          label={tr("Mật khẩu", "Password")}
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            clearMessages();
            setPassword(event.target.value);
          }}
          placeholder={tr("Tối thiểu 8 ký tự", "At least 8 characters")}
          hint={tr("Nên dùng chữ hoa, chữ thường, số và ký tự đặc biệt.", "Use uppercase, lowercase, numbers and special characters.")}
          required
        />
        <PasswordInput
          label={tr("Xác nhận mật khẩu", "Confirm password")}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            clearMessages();
            setConfirmPassword(event.target.value);
          }}
          placeholder={tr("Nhập lại mật khẩu", "Re-enter password")}
          required
        />

        {localError || error ? (
          <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
            {localError || error}
          </div>
        ) : null}

        <Button size="lg" loading={status === "loading"} type="submit" className="w-full">
          <UserRoundPlus size={17} aria-hidden /> {tr("Tạo tài khoản", "Create account")} <ArrowRight size={17} aria-hidden />
        </Button>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
          <span className="text-ink-soft">{tr("Đã có tài khoản?", "Already have an account?")}</span>
          <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            {tr("Đăng nhập", "Sign in")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
