"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session-store";

type Organization = { id: number; name: string };
type ApiKey = { id: number; name: string; prefix: string; environment: "test" | "live"; revoked_at: string | null };
type Wallet = { available_vnd: number; reserved_vnd: number };
type Entry = { id: number; kind: string; amount_vnd: number; created_at: string };
type TopUp = { id: string; payment_code: string; amount_vnd: number; received_vnd: number; status: string; expires_at: string; qr_url?: string };
const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} đ`;

async function request<T>(path: string, token: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(`/api/django/api/developer/${path}`, {
    method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(response.status === 404 ? "Tính năng đang được chuẩn bị." : `Không thể thực hiện yêu cầu (${response.status}).`);
  return await response.json() as T;
}

export default function DeveloperPage() {
  const { accessToken, initialized } = useSessionStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<number | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("2000");
  const [order, setOrder] = useState<TopUp | null>(null);
  const [orders, setOrders] = useState<TopUp[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshOrganizations = useCallback(async () => {
    if (!accessToken) return;
    const result = await request<Organization[]>("organizations/", accessToken);
    setOrganizations(result);
    setOrganization((current) => current && result.some((item) => item.id === current) ? current : result[0]?.id ?? null);
  }, [accessToken]);

  const refreshWallet = useCallback(async () => {
    if (!accessToken || !organization) return;
    const base = `organizations/${organization}/`;
    const [balance, ledger, keyList] = await Promise.all([
      request<Wallet>(`${base}wallets/live/`, accessToken),
      request<{ results: Entry[] }>(`${base}wallets/live/ledger/`, accessToken),
      request<ApiKey[]>(`${base}keys/`, accessToken),
    ]);
    setWallet(balance); setEntries(ledger.results); setKeys(keyList);
    const topups = await request<TopUp[]>(`${base}topups/`, accessToken).catch(() => [] as TopUp[]);
    setOrders(topups);
  }, [accessToken, organization]);

  useEffect(() => { void refreshOrganizations().catch((err: Error) => setError(err.message)); }, [refreshOrganizations]);
  useEffect(() => { setWallet(null); setOrder(null); setSecret(""); void refreshWallet().catch((err: Error) => setError(err.message)); }, [refreshWallet]);

  async function action(fn: () => Promise<void>) {
    setBusy(true); setError("");
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra."); }
    finally { setBusy(false); }
  }
  async function checkOrder() {
    if (!accessToken || !organization || !order) return;
    const updated = await request<TopUp>(`organizations/${organization}/topups/${order.id}/`, accessToken);
    setOrder((current) => current ? { ...current, ...updated } : updated);
    await refreshWallet();
  }
  const validAmount = /^\d+$/.test(amount) && Number(amount) >= 2000 && Number(amount) <= 100000000;
  const qrUrl = order?.qr_url && /^https:\/\/(?:qr\.sepay\.vn|vietqr\.app)\//i.test(order.qr_url) ? order.qr_url : null;

  if (!initialized) return <p>Đang tải tài khoản...</p>;
  if (!accessToken) return <p>Vui lòng đăng nhập để quản lý API.</p>;
  return (
    <div className="space-y-6 pb-10">
      <header><p className="text-sm font-semibold uppercase tracking-wider text-leaf">Dành cho nhà phát triển</p><h1 className="mt-2 text-3xl font-bold text-ink">Agromind AI API</h1><p className="mt-2 text-ink-muted">Quản lý khóa, số dư và lịch sử sử dụng tại một nơi.</p></header>
      {error && <div role="alert" className="rounded-lg border border-danger bg-surface p-4 text-danger">{error}</div>}
      {!organization ? <Card className="space-y-4"><h2 className="text-xl font-bold">Tạo không gian API</h2><label className="block">Tên tổ chức<input className="mt-2 block w-full rounded-lg border border-line bg-surface p-3" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} /></label><Button disabled={busy || !name.trim()} onClick={() => void action(async () => { await request("organizations/", accessToken, "POST", { name }); await refreshOrganizations(); })}>Tạo không gian</Button></Card> : <>
        {organizations.length > 1 && <label className="block">Tổ chức <select className="rounded-lg border border-line bg-surface p-2" value={organization} onChange={(e) => setOrganization(Number(e.target.value))}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}
        <div className="grid gap-5 lg:grid-cols-2"><Card className="space-y-3"><p className="text-sm font-semibold text-ink-muted">Số dư API thực tế</p><p className="text-3xl font-bold">{wallet ? money(wallet.available_vnd) : "—"}</p><p className="text-sm text-ink-muted">Đang tạm giữ: {wallet ? money(wallet.reserved_vnd) : "—"}. Giá dự kiến: 200đ/lượt thành công.</p><Button variant="outline" disabled={busy} onClick={() => void action(refreshWallet)}>Cập nhật số dư</Button></Card>
          <Card className="space-y-3"><h2 className="text-xl font-bold">Nạp số dư qua SePay</h2><p className="text-sm text-ink-muted">Từ 2.000đ đến 100.000.000đ mỗi lần. Số dư chỉ cộng sau khi giao dịch được xác nhận.</p><label className="block">Số tiền (VNĐ)<input type="number" min={2000} max={100000000} step={1} className="mt-2 block w-full rounded-lg border border-line bg-surface p-3" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><Button disabled={busy || !validAmount} onClick={() => void action(async () => { const created = await request<TopUp>(`organizations/${organization}/topups/`, accessToken, "POST", { amount_vnd: Number(amount) }); setOrder(created); await refreshWallet(); })}>Tạo mã chuyển khoản</Button></Card></div>
        {order && <Card className="space-y-3"><h2 className="text-xl font-bold">Chuyển khoản {money(order.amount_vnd)}</h2><p>Trạng thái: <strong>{order.status === "paid" ? "Đã xác nhận" : order.status === "review" ? "Cần đối soát" : order.status === "pending" && new Date(order.expires_at).getTime() <= Date.now() ? "Đã hết hạn" : "Đang chờ xác nhận"}</strong></p><p>Nội dung chuyển khoản: <strong className="break-all">{order.payment_code}</strong></p><p className="text-sm text-ink-muted">Chuyển đúng số tiền và nội dung trước {new Date(order.expires_at).toLocaleString("vi-VN")}. Chuyển thiếu, thừa hoặc sau hạn cần đối soát.</p>{qrUrl && order.status === "pending" && new Date(order.expires_at).getTime() > Date.now() && <Image src={qrUrl} alt="Mã QR chuyển khoản SePay" width={260} height={260} unoptimized />}<Button variant="outline" disabled={busy} onClick={() => void action(checkOrder)}>Kiểm tra trạng thái</Button></Card>}
        {orders.length > 0 && <Card className="space-y-3"><h2 className="text-xl font-bold">Lệnh nạp gần đây</h2><p className="text-sm text-ink-muted">Chọn một lệnh để xem lại mã và kiểm tra trạng thái.</p><ul>{orders.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3"><span>{money(item.amount_vnd)} · <code>{item.payment_code}</code></span><Button variant="outline" onClick={() => setOrder(item)}>Xem lệnh</Button></li>)}</ul></Card>}
        <Card className="space-y-4"><h2 className="text-xl font-bold">Khóa API</h2><p className="text-sm text-ink-muted">Giữ khóa trên máy chủ của bạn, không đưa vào mã chạy trong trình duyệt. Khóa chỉ hiển thị một lần.</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void action(async () => { const result = await request<ApiKey & { secret: string }>(`organizations/${organization}/keys/`, accessToken, "POST", { name: "Khóa thử nghiệm", environment: "test" }); setSecret(result.secret); await refreshWallet(); })}>Tạo khóa thử nghiệm</Button><Button variant="outline" disabled={busy} onClick={() => void action(async () => { const result = await request<ApiKey & { secret: string }>(`organizations/${organization}/keys/`, accessToken, "POST", { name: "Khóa thực tế", environment: "live" }); setSecret(result.secret); await refreshWallet(); })}>Tạo khóa thực tế</Button></div>{secret && <div className="rounded-lg border border-line bg-surface-soft p-4"><p>Lưu khóa ở nơi an toàn. Khóa sẽ không hiển thị lại:</p><code className="block break-all py-3">{secret}</code><Button variant="outline" onClick={() => setSecret("")}>Đã lưu, ẩn khóa</Button></div>}<ul className="space-y-2">{keys.map((key) => <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3"><span>{key.name} · <code>{key.prefix}...</code> · {key.revoked_at ? "Đã thu hồi" : "Đang hoạt động"}</span>{!key.revoked_at && <Button variant="outline" disabled={busy} onClick={() => { if (window.confirm("Thu hồi khóa này? Các ứng dụng đang dùng khóa sẽ ngừng hoạt động.")) void action(async () => { await request(`organizations/${organization}/keys/${key.id}/revoke/`, accessToken, "POST"); await refreshWallet(); }); }}>Thu hồi</Button>}</li>)}</ul></Card>
        <Card className="space-y-3"><h2 className="text-xl font-bold">Lịch sử ví gần đây</h2>{entries.length === 0 ? <p className="text-ink-muted">Chưa có giao dịch.</p> : <ul>{entries.map((entry) => <li key={entry.id} className="flex justify-between gap-3 border-t border-line py-3"><span>{({ topup: "Nạp tiền", reserve: "Tạm giữ", charge: "Tính phí", release: "Hoàn tạm giữ" } as Record<string, string>)[entry.kind] ?? entry.kind}<br /><small>{new Date(entry.created_at).toLocaleString("vi-VN")}</small></span><strong>{money(entry.amount_vnd)}</strong></li>)}</ul>}</Card>
      </>}
    </div>
  );
}
