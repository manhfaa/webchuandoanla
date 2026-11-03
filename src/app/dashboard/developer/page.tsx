"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, Code2, Copy, CreditCard, ExternalLink, FlaskConical, KeyRound, Leaf, LockKeyhole, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessionStore } from "@/store/session-store";

type Organization = { id: number; name: string };
type ApiKey = { id: number; name: string; prefix: string; environment: "test" | "live"; revoked_at: string | null };
type Wallet = { available_vnd: number; reserved_vnd: number };
type Entry = { id: number; kind: string; amount_vnd: number; created_at: string };
type TopUp = { id: string; payment_code: string; amount_vnd: number; received_vnd: number; status: string; expires_at: string; qr_url?: string };
type DeveloperConfig = { staff_preview: boolean; live_enabled: boolean; topup_enabled: boolean; inference_enabled: boolean; price_vnd: number; topup_min_vnd: number; topup_max_vnd: number };

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
const endpoint = "https://api.agromind.farm/api/developer/v1/diagnoses/";

async function request<T>(path: string, token: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(`/api/django/api/developer/${path}`, {
    method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(response.status === 404 ? "Tính năng đang được chuẩn bị hoặc tài khoản chưa được cấp quyền." : `Không thể thực hiện yêu cầu (${response.status}).`);
  return await response.json() as T;
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf-strong">{eyebrow}</p><h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink">{title}</h2>{description && <p className="mt-1.5 text-sm leading-6 text-ink-muted">{description}</p>}</div>;
}

export default function DeveloperPage() {
  const email = useSessionStore((state) => state.user?.email);
  return <DeveloperWorkspace key={email ?? "anonymous"} />;
}

function DeveloperWorkspace() {
  const { accessToken, initialized } = useSessionStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [config, setConfig] = useState<DeveloperConfig | null>(null);
  const [organization, setOrganization] = useState<number | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [testWallet, setTestWallet] = useState<Wallet | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [testEntries, setTestEntries] = useState<Entry[]>([]);
  const [ledgerMode, setLedgerMode] = useState<"test" | "live">("test");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("2000");
  const [order, setOrder] = useState<TopUp | null>(null);
  const [orders, setOrders] = useState<TopUp[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const refreshOrganizations = useCallback(async () => {
    if (!accessToken) return;
    const [result, settings] = await Promise.all([request<Organization[]>("organizations/", accessToken), request<DeveloperConfig>("config/", accessToken)]);
    setConfig(settings);
    setOrganizations(result);
    setOrganization((current) => current && result.some((item) => item.id === current) ? current : result[0]?.id ?? null);
  }, [accessToken]);

  const refreshWallet = useCallback(async () => {
    if (!accessToken || !organization) return;
    const base = `organizations/${organization}/`;
    const [balance, testBalance, ledger, testLedger, keyList] = await Promise.all([
      request<Wallet>(`${base}wallets/live/`, accessToken),
      request<Wallet>(`${base}wallets/test/`, accessToken),
      request<{ results: Entry[] }>(`${base}wallets/live/ledger/`, accessToken),
      request<{ results: Entry[] }>(`${base}wallets/test/ledger/`, accessToken),
      request<ApiKey[]>(`${base}keys/`, accessToken),
    ]);
    setWallet(balance); setTestWallet(testBalance); setEntries(ledger.results); setTestEntries(testLedger.results); setKeys(keyList);
    const topups = await request<TopUp[]>(`${base}topups/`, accessToken).catch(() => [] as TopUp[]);
    setOrders(topups);
  }, [accessToken, organization]);

  useEffect(() => { if (!accessToken) return; void refreshOrganizations().catch((err: Error) => setError(err.message)).finally(() => setLoading(false)); }, [refreshOrganizations, accessToken]);
  useEffect(() => { setWallet(null); setTestWallet(null); setEntries([]); setTestEntries([]); setOrder(null); setSecret(""); setCopied(false); void refreshWallet().catch((err: Error) => setError(err.message)); }, [refreshWallet]);

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
  async function createKey(environment: "test" | "live") {
    if (!accessToken || !organization) return;
    const result = await request<ApiKey & { secret: string }>(`organizations/${organization}/keys/`, accessToken, "POST", { name: environment === "test" ? "Khóa thử nghiệm" : "Khóa thực tế", environment });
    setCopied(false); setSecret(result.secret);
    await refreshWallet();
  }
  async function copySecret() {
    try { await navigator.clipboard.writeText(secret); setCopied(true); }
    catch { setError("Không thể sao chép tự động. Hãy chọn và sao chép khóa bên dưới."); }
  }

  const validAmount = !!config && /^\d+$/.test(amount) && Number(amount) >= config.topup_min_vnd && Number(amount) <= config.topup_max_vnd;
  const qrUrl = order?.qr_url && /^https:\/\/(?:qr\.sepay\.vn|vietqr\.app)\//i.test(order.qr_url) ? order.qr_url : null;
  const visibleEntries = ledgerMode === "test" ? testEntries : entries;
  const activeKeys = keys.filter((key) => !key.revoked_at).length;

  if (!initialized || (accessToken && loading)) return <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-muted">Đang tải không gian API...</div>;
  if (!accessToken) return <p>Vui lòng đăng nhập để quản lý API.</p>;
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-12 sm:space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-forest px-6 py-8 text-on-forest sm:px-9 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute right-8 top-8 hidden h-52 w-52 rotate-45 rounded-[45%_0_45%_0] border border-white/10 sm:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200"><Leaf size={15} /> Agromind for developers</p><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Đưa hiểu biết về cây trồng<br className="hidden sm:block" /> vào sản phẩm của bạn.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100 sm:text-base">Một không gian để quản lý khóa, theo dõi sử dụng và kết nối API nhận diện lá cây.</p></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-300" />{config?.live_enabled ? "API thực tế đang hoạt động" : config?.staff_preview ? "Truy cập giới hạn" : "Đang chuẩn bị"}</span>
        </div>
      </header>

      {config?.staff_preview && <div className="flex gap-3 rounded-2xl border border-line bg-surface-soft px-5 py-4 text-sm leading-6 text-ink"><FlaskConical className="mt-0.5 shrink-0 text-leaf-strong" size={19} /><p><strong>{config.live_enabled ? "Tài khoản này đã được mở thanh toán thật." : "Tài khoản này có quyền truy cập giới hạn."}</strong> Số dư thử nghiệm không phải tiền thật và tách biệt với ví thực tế.{!config.live_enabled && " Nạp tiền và khóa thực tế chưa được mở cho tài khoản này."}</p></div>}
      {error && <div role="alert" className="rounded-2xl border border-danger bg-surface p-4 text-sm text-danger">{error}</div>}

      {!organization ? (
        !error && <Card className="max-w-2xl space-y-5 p-6 sm:p-8"><SectionTitle eyebrow="Bắt đầu" title="Tạo không gian API" description="Đặt tên để quản lý khóa và số dư cho dự án của bạn." /><label className="block text-sm font-semibold text-ink">Tên tổ chức<input className="mt-2 block min-h-11 w-full rounded-xl border border-line bg-surface-soft p-3 text-ink outline-none focus:border-leaf" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} /></label><Button disabled={busy || !name.trim()} onClick={() => void action(async () => { await request("organizations/", accessToken, "POST", { name }); await refreshOrganizations(); })}>Tạo không gian <ArrowRight size={17} /></Button></Card>
      ) : <>
        {organizations.length > 1 && <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">Không gian <select className="min-h-11 rounded-xl border border-line bg-surface px-3" value={organization} onChange={(e) => setOrganization(Number(e.target.value))}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="min-w-0 p-6"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-ink-muted">Số dư thực tế</span><WalletCards size={19} className="text-leaf-strong" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink">{wallet ? money(wallet.available_vnd) : "—"}</p><p className="mt-2 text-xs text-ink-muted">Đang tạm giữ {wallet ? money(wallet.reserved_vnd) : "—"}</p></Card>
          <Card className="min-w-0 p-6"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-ink-muted">Số dư thử nghiệm</span><FlaskConical size={19} className="text-leaf-strong" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink">{testWallet ? money(testWallet.available_vnd) : "—"}</p><p className="mt-2 text-xs text-ink-muted">Số dư giả, không thể rút hoặc thanh toán.</p></Card>
          <Card className="min-w-0 p-6"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-ink-muted">Đơn giá nhận diện</span><Leaf size={19} className="text-leaf-strong" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink">{config ? money(config.price_vnd) : "—"}<span className="ml-1 text-sm font-medium text-ink-muted">/ lượt</span></p><p className="mt-2 text-xs text-ink-muted">Theo kết quả xử lý thành công.</p></Card>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="min-w-0 space-y-5">
            <Card className="min-w-0 p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><SectionTitle eyebrow="01 / Truy cập" title="Khóa API" description="Khóa giúp ứng dụng của bạn kết nối an toàn với Agromind AI." /><span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-semibold text-ink-muted">{activeKeys} khóa hoạt động</span></div>
              <div className="mt-5 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void action(() => createKey("test"))}><KeyRound size={16} /> Tạo khóa thử nghiệm</Button><Button variant="outline" disabled={busy || !config?.live_enabled} onClick={() => void action(() => createKey("live"))}>Tạo khóa thực tế</Button></div>
              {!config?.live_enabled && <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted"><LockKeyhole size={14} /> Khóa thực tế chưa được kích hoạt.</p>}
              {secret && <div role="status" className="mt-5 rounded-2xl border border-line-strong bg-surface-soft p-4"><p className="flex items-center gap-2 text-sm font-bold text-ink"><ShieldCheck size={17} className="text-leaf-strong" /> Lưu khóa ngay</p><p className="mt-1 text-sm text-ink-muted">Khóa chỉ hiển thị một lần. Không đưa vào mã trình duyệt hoặc kho Git.</p><code className="my-3 block break-all rounded-xl border border-line bg-surface p-3 text-sm text-ink">{secret}</code><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void copySecret()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Đã sao chép" : "Sao chép khóa"}</Button><Button variant="ghost" onClick={() => { setSecret(""); setCopied(false); }}>Đã lưu, ẩn khóa</Button></div></div>}
              <div className="mt-5 border-t border-line">{keys.length === 0 ? <p className="py-6 text-sm text-ink-muted">Chưa có khóa nào. Tạo khóa thử nghiệm để bắt đầu.</p> : keys.map((key) => <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 last:border-b-0"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-soft text-leaf-strong"><KeyRound size={17} /></span><div className="min-w-0"><p className="font-semibold text-ink">{key.name} <span className="ml-1 text-xs font-medium text-ink-muted">· {key.environment === "test" ? "Thử nghiệm" : "Thực tế"}</span></p><code className="block break-all text-xs text-ink-muted">{key.prefix}...</code></div></div><div className="flex items-center gap-3"><span className="text-xs font-medium text-ink-muted">{key.revoked_at ? "Đã thu hồi" : "Đang hoạt động"}</span>{!key.revoked_at && <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm("Thu hồi khóa này? Các ứng dụng đang dùng khóa sẽ ngừng hoạt động.")) void action(async () => { await request(`organizations/${organization}/keys/${key.id}/revoke/`, accessToken, "POST"); await refreshWallet(); }); }}>Thu hồi</Button>}</div></div>)}</div>
            </Card>

            <Card className="min-w-0 p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><SectionTitle eyebrow="02 / Theo dõi" title="Lịch sử ví" description="Xem các khoản nạp, tạm giữ và phí đã ghi nhận." /><Button size="sm" variant="outline" disabled={busy} onClick={() => void action(refreshWallet)}><RefreshCw size={15} /> Cập nhật</Button></div>
              <div className="mt-5 inline-flex rounded-xl bg-surface-soft p-1" aria-label="Chọn lịch sử ví"><button type="button" aria-pressed={ledgerMode === "test"} onClick={() => setLedgerMode("test")} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${ledgerMode === "test" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}>Thử nghiệm</button><button type="button" aria-pressed={ledgerMode === "live"} onClick={() => setLedgerMode("live")} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${ledgerMode === "live" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}>Thực tế</button></div>
              <div className="mt-3">{visibleEntries.length === 0 ? <div className="rounded-2xl border border-dashed border-line px-5 py-9 text-center text-sm text-ink-muted">Chưa có giao dịch trong ví này.</div> : <ul>{visibleEntries.map((entry) => <li key={entry.id} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0"><span className="min-w-0"><span className="block text-sm font-semibold text-ink">{({ topup: ledgerMode === "test" ? "Cấp số dư thử" : "Nạp tiền", reserve: "Tạm giữ", charge: "Tính phí", release: "Hoàn tạm giữ" } as Record<string, string>)[entry.kind] ?? entry.kind}</span><span className="text-xs text-ink-muted">{new Date(entry.created_at).toLocaleString("vi-VN")}</span></span><strong className="shrink-0 text-sm text-ink">{money(entry.amount_vnd)}</strong></li>)}</ul>}</div>
            </Card>
          </div>

          <div className="min-w-0 space-y-5">
            <Card className="min-w-0 p-6 sm:p-7"><div className="flex items-start justify-between gap-3"><SectionTitle eyebrow="03 / Số dư" title="Nạp qua SePay" description="Chọn số tiền và chuyển khoản theo mã được tạo." /><CreditCard size={20} className="shrink-0 text-leaf-strong" /></div>
              <div className="mt-5 rounded-xl bg-surface-soft p-4 text-sm leading-6 text-ink-muted">{config ? `Mỗi lần từ ${money(config.topup_min_vnd)} đến ${money(config.topup_max_vnd)}.` : ""} Số dư chỉ được cộng sau khi giao dịch được xác nhận.</div>
              {!config?.topup_enabled && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink"><LockKeyhole size={15} /> Chưa mở nạp tiền thật</p>}
              <label className="mt-5 block text-sm font-semibold text-ink">Số tiền (VNĐ)<input type="number" min={config?.topup_min_vnd ?? 2000} max={config?.topup_max_vnd ?? 100000000} step={1} className="mt-2 block min-h-11 w-full rounded-xl border border-line bg-surface-soft p-3 text-ink outline-none focus:border-leaf" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <Button className="mt-4 w-full" disabled={busy || !validAmount || !config?.topup_enabled} onClick={() => void action(async () => { const created = await request<TopUp>(`organizations/${organization}/topups/`, accessToken, "POST", { amount_vnd: Number(amount) }); setOrder(created); await refreshWallet(); })}>Tạo mã chuyển khoản <ArrowRight size={16} /></Button>
            </Card>

            {order && <Card className="space-y-3 p-6"><SectionTitle eyebrow="Lệnh chuyển khoản" title={money(order.amount_vnd)} /><p className="text-sm text-ink">Trạng thái: <strong>{order.status === "paid" ? "Đã xác nhận" : order.status === "review" ? "Cần đối soát" : order.status === "expired" || (order.status === "pending" && new Date(order.expires_at).getTime() <= Date.now()) ? "Đã hết hạn" : "Đang chờ xác nhận"}</strong></p><p className="text-sm text-ink">Nội dung: <strong className="break-all">{order.payment_code}</strong></p><p className="text-xs leading-5 text-ink-muted">Chuyển đúng số tiền và nội dung trước {new Date(order.expires_at).toLocaleString("vi-VN")}. Chuyển thiếu, thừa hoặc sau hạn cần đối soát.</p>{qrUrl && order.status === "pending" && new Date(order.expires_at).getTime() > Date.now() && <Image src={qrUrl} alt="Mã QR chuyển khoản SePay" width={260} height={260} unoptimized />}<Button variant="outline" disabled={busy} onClick={() => void action(checkOrder)}>Kiểm tra trạng thái</Button></Card>}
            {orders.length > 0 && <Card className="space-y-3 p-6"><SectionTitle eyebrow="SePay" title="Lệnh nạp gần đây" /><ul>{orders.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3"><span className="text-sm">{money(item.amount_vnd)} · <code className="break-all">{item.payment_code}</code></span><Button size="sm" variant="outline" onClick={() => setOrder(item)}>Xem lệnh</Button></li>)}</ul></Card>}

            <Card className="min-w-0 p-6 sm:p-7"><div className="flex items-start justify-between gap-3"><SectionTitle eyebrow="04 / Tích hợp" title="Bắt đầu gọi API" description="Gửi ảnh từ máy chủ của bạn bằng multipart." /><Code2 size={20} className="shrink-0 text-leaf-strong" /></div><div className="mt-5 rounded-2xl bg-forest p-4 text-on-forest"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200">Endpoint · POST</p><code className="mt-2 block break-all text-xs leading-6 sm:text-sm">{endpoint}</code></div><p className="mt-4 text-sm leading-6 text-ink-muted">Dùng cùng mã yêu cầu khi thử lại cùng ảnh để tránh tính phí hai lần. Không nhúng khóa trong ứng dụng hoặc trình duyệt.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{[{ name: "Python SDK", url: "https://github.com/manhfaa/webchuandoanla/tree/main/sdk/python" }, { name: "Node.js SDK", url: "https://github.com/manhfaa/webchuandoanla/tree/main/sdk/node" }].map((item) => <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-soft"><span className="flex items-center gap-2"><BookOpen size={16} className="text-leaf-strong" />{item.name}</span><ExternalLink size={15} className="text-ink-muted" /></a>)}</div></Card>
          </div>
        </div>
      </>}
    </div>
  );
}
