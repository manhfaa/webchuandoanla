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
      eyebrow="Tạo tài khoản"
      title="Bắt đầu theo dõi sức khỏe cây trồng"
      description="Chỉ cần email và mật khẩu để lưu kết quả kiểm tra, vị trí vườn và kế hoạch chăm sóc của bạn."
      asideTitle="Mỗi lần kiểm tra trở thành một dấu mốc của khu vườn."
      asideDescription="Lưu ảnh và kết quả theo thời gian giúp bạn nhận ra thay đổi sớm hơn, thay vì chỉ xem một lần rồi quên."
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
          label="Mật khẩu"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            clearMessages();
            setPassword(event.target.value);
          }}
          placeholder="Tối thiểu 8 ký tự"
          hint="Nên dùng chữ hoa, chữ thường, số và ký tự đặc biệt."
          required
        />
        <PasswordInput
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            clearMessages();
            setConfirmPassword(event.target.value);
          }}
          placeholder="Nhập lại mật khẩu"
          required
        />

        {localError || error ? (
          <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
            {localError || error}
          </div>
        ) : null}

        <Button size="lg" loading={status === "loading"} type="submit" className="w-full">
          <UserRoundPlus size={17} aria-hidden /> Tạo tài khoản <ArrowRight size={17} aria-hidden />
        </Button>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row">
          <span className="text-ink-soft">Đã có tài khoản?</span>
          <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Đăng nhập
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
