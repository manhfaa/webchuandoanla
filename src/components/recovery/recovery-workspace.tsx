"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Check, ImagePlus, Leaf, Plus, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchDiagnosisPage, fetchDiagnosisRecord } from "@/lib/diagnoses-client";
import { fetchFarmPlots, type FarmPlot } from "@/lib/farmops-client";
import {
  createRecoveryCase, createRecoveryCheckIn, fetchRecoveryCase, fetchRecoveryCases,
  updateRecoveryCase, type RecoveryCase, type RecoveryCondition, type RecoveryPhoto,
} from "@/lib/recovery-client";
import { useTr } from "@/lib/use-tr";
import { formatDate } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import type { DiagnosisRecord } from "@/types";

const inputClass = "min-h-11 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-leaf)]";

const demoCase: RecoveryCase = {
  id: 1, title: "Theo dõi cà chua tại lô vườn chính", plant_name: "Cà chua",
  baseline_diagnosis: { id: 1, plant_name: "Cà chua", disease_name: "Đốm lá", thumbnail_url: "/plant-leaves/tomato.jpg", created_at: "2026-10-20T08:00:00Z" },
  plot: 1, plot_name: "Lô vườn chính", next_check_date: "2026-10-28", is_closed: false,
  check_in_count: 1, created_at: "2026-10-20T08:00:00Z", updated_at: "2026-10-23T08:00:00Z",
  check_ins: [{ id: 1, diagnosis: { id: 2, plant_name: "Cà chua", disease_name: "Đốm lá", thumbnail_url: "/plant-leaves/tomato.jpg", created_at: "2026-10-23T08:00:00Z" }, condition: "uncertain", affected_leaves: 4, note: "Đã chụp lại, cần quan sát thêm.", action_taken: "Tỉa lá sát đất và giữ lá khô.", created_at: "2026-10-23T08:00:00Z" }],
};

const demoDiagnoses: DiagnosisRecord[] = [
  { id: "1", plant: "Cà chua", disease: "Đốm lá", confidence: 0.82, severity: "Cần theo dõi", classificationReady: true, image: "/plant-leaves/tomato.jpg", createdAt: "2026-10-20T08:00:00Z", note: "", yoloVerified: true, symptomSummary: "", causes: [], recommendations: [] },
  { id: "2", plant: "Cà chua", disease: "Đốm lá", confidence: 0.78, severity: "Cần theo dõi", classificationReady: true, image: "/plant-leaves/tomato.jpg", createdAt: "2026-10-23T08:00:00Z", note: "", yoloVerified: true, symptomSummary: "", causes: [], recommendations: [] },
  { id: "3", plant: "Cà chua", disease: "Đốm lá", confidence: 0.76, severity: "Cần theo dõi", classificationReady: true, image: "/plant-leaves/hero-tomato-septoria.jpg", createdAt: "2026-10-25T08:00:00Z", note: "", yoloVerified: true, symptomSummary: "", causes: [], recommendations: [] },
];

const demoPlots: FarmPlot[] = [{ id: 1, name: "Lô vườn chính", crop_type: "Cà chua", area_unit: "m2", address_text: "", growth_stage: "", note: "" }];

function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function conditionLabel(condition: RecoveryCondition, tr: (vi: string, en: string) => string) {
  if (condition === "improving") return tr("Có cải thiện", "Improving");
  if (condition === "unchanged") return tr("Chưa đổi", "Unchanged");
  if (condition === "worsening") return tr("Xấu đi", "Worsening");
  return tr("Chưa rõ", "Uncertain");
}

function PhotoPanel({ photo, label, eager = false }: { photo: RecoveryPhoto | null; label: string; eager?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative aspect-[4/3] w-full bg-surface-soft">
        {photo?.thumbnail_url ? <Image src={photo.thumbnail_url} alt={label} fill unoptimized loading={eager ? "eager" : "lazy"} sizes="(max-width: 640px) 100vw, 450px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-ink-soft"><Leaf size={36} aria-hidden /></div>}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-leaf-strong">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-ink">{photo?.disease_name || photo?.plant_name || "—"}</p>
        {photo?.created_at ? <p className="mt-1 text-xs text-ink-soft">{formatDate(photo.created_at)}</p> : null}
      </div>
    </div>
  );
}

export function RecoveryWorkspace({ demo = false }: { demo?: boolean }) {
  const tr = useTr();
  const accessToken = useSessionStore((state) => state.accessToken);
  const [cases, setCases] = useState<RecoveryCase[]>(demo ? [demoCase] : []);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<RecoveryCase | null>(demo ? demoCase : null);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>(demo ? demoDiagnoses : []);
  const [plots, setPlots] = useState<FarmPlot[]>(demo ? demoPlots : []);
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [baselineId, setBaselineId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [title, setTitle] = useState("");
  const [nextDate, setNextDate] = useState(dateInDays(5));
  const [followupId, setFollowupId] = useState("");
  const [condition, setCondition] = useState<RecoveryCondition>("uncertain");
  const [affectedLeaves, setAffectedLeaves] = useState("");
  const [note, setNote] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [sameSubjectConfirmed, setSameSubjectConfirmed] = useState(false);

  useEffect(() => {
    if (demo || !accessToken) return;
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const targetDiagnosis = params.get("diagnosis");
    const targetCase = Number(params.get("case"));
    void Promise.all([fetchRecoveryCases(accessToken), fetchDiagnosisPage(accessToken, { limit: 50 }), fetchFarmPlots(accessToken)])
      .then(async ([casePage, diagnosisPage, farmPlots]) => {
        if (cancelled) return;
        setCases(casePage.results);
        setNextOffset(casePage.next_offset);
        setDiagnoses(diagnosisPage.records);
        setPlots(farmPlots);
        if (targetDiagnosis && /^\d+$/.test(targetDiagnosis)) {
          setBaselineId(targetDiagnosis);
          setFollowupId(targetDiagnosis);
          if (!diagnosisPage.records.some((item) => item.id === targetDiagnosis)) {
            const record = await fetchDiagnosisRecord(accessToken, targetDiagnosis);
            if (!cancelled) setDiagnoses((current) => [record, ...current]);
          }
        }
        if (targetCase && casePage.results.some((item) => item.id === targetCase)) {
          const detail = await fetchRecoveryCase(accessToken, targetCase);
          if (!cancelled) { setSelected(detail); setCheckingIn(Boolean(targetDiagnosis)); }
        } else if (targetDiagnosis) {
          setCreating(true);
        } else if (casePage.results[0]) {
          const detail = await fetchRecoveryCase(accessToken, casePage.results[0].id);
          if (!cancelled) setSelected(detail);
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : tr("Không tải được đợt theo dõi.", "Could not load recovery cases.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, demo, tr]);

  async function chooseCase(id: number) {
    if (demo) { setSelected(cases.find((item) => item.id === id) ?? null); setCheckingIn(false); return; }
    setError("");
    setBusy(true);
    try { setSelected(await fetchRecoveryCase(accessToken, id)); setCheckingIn(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : tr("Không mở được đợt theo dõi.", "Could not open this recovery case.")); }
    finally { setBusy(false); }
  }

  async function refresh(id: number) {
    const [page, detail] = await Promise.all([fetchRecoveryCases(accessToken), fetchRecoveryCase(accessToken, id)]);
    setCases(page.results);
    setNextOffset(page.next_offset);
    setSelected(detail);
  }

  async function loadMore() {
    if (nextOffset === null) return;
    setBusy(true); setError("");
    try {
      const page = await fetchRecoveryCases(accessToken, nextOffset);
      setCases((current) => [...current, ...page.results.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextOffset(page.next_offset);
    } catch (cause) { setError(cause instanceof Error ? cause.message : tr("Không tải được trang tiếp.", "Could not load more cases.")); }
    finally { setBusy(false); }
  }

  async function startCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!baselineId) return;
    if (demo) {
      const record = diagnoses.find((item) => item.id === baselineId);
      if (!record) return;
      const created: RecoveryCase = {
        id: Math.max(...cases.map((item) => item.id)) + 1,
        title: title.trim() || `Theo dõi ${record.plant}`,
        plant_name: record.plant,
        baseline_diagnosis: { id: Number(record.id), plant_name: record.plant, disease_name: record.disease, thumbnail_url: record.image, created_at: record.createdAt },
        plot: plotId ? Number(plotId) : null, plot_name: plots.find((item) => String(item.id) === plotId)?.name ?? "",
        next_check_date: nextDate, is_closed: false, check_in_count: 0, check_ins: [],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setCases((current) => [created, ...current]); setSelected(created); setCreating(false);
      setNotice(tr("Đã thêm vào bản minh họa; không có dữ liệu nào được lưu.", "Added to preview only; no data was saved."));
      return;
    }
    setBusy(true); setError("");
    try {
      const created = await createRecoveryCase(accessToken, { baseline_diagnosis_id: Number(baselineId), plot_id: plotId ? Number(plotId) : null, title: title.trim() || undefined, next_check_date: nextDate });
      await refresh(created.id);
      setCreating(false);
      setNotice(tr("Đã tạo hộ chiếu phục hồi.", "Recovery case created."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : tr("Không tạo được đợt theo dõi.", "Could not create recovery case.")); }
    finally { setBusy(false); }
  }

  async function addCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !followupId) return;
    if (demo) {
      const record = diagnoses.find((item) => item.id === followupId);
      if (!record) return;
      const updated: RecoveryCase = {
        ...selected, next_check_date: nextDate, check_in_count: selected.check_in_count + 1,
        check_ins: [...(selected.check_ins ?? []), {
          id: selected.check_in_count + 1,
          diagnosis: { id: Number(record.id), plant_name: record.plant, disease_name: record.disease, thumbnail_url: record.image, created_at: record.createdAt },
          condition, affected_leaves: affectedLeaves ? Number(affectedLeaves) : null, note: note.trim(), action_taken: actionTaken.trim(), created_at: new Date().toISOString(),
        }],
      };
      setSelected(updated); setCases((current) => current.map((item) => item.id === updated.id ? updated : item));
      setCheckingIn(false); setSameSubjectConfirmed(false); setFollowupId("");
      setNotice(tr("Đã thêm lần tái kiểm tra vào bản minh họa.", "Follow-up added to preview only."));
      return;
    }
    setBusy(true); setError("");
    try {
      await createRecoveryCheckIn(accessToken, selected.id, { diagnosis_id: Number(followupId), same_subject_confirmed: true, condition, affected_leaves: affectedLeaves ? Number(affectedLeaves) : null, note: note.trim(), action_taken: actionTaken.trim(), next_check_date: nextDate });
      await refresh(selected.id);
      setCheckingIn(false); setFollowupId(""); setNote(""); setActionTaken(""); setAffectedLeaves(""); setSameSubjectConfirmed(false);
      setNotice(tr("Đã lưu lần tái kiểm tra.", "Follow-up saved."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : tr("Không lưu được lần tái kiểm tra.", "Could not save the follow-up.")); }
    finally { setBusy(false); }
  }

  async function toggleClosed() {
    if (!selected) return;
    if (demo) {
      const updated = { ...selected, is_closed: !selected.is_closed };
      setSelected(updated); setCases((current) => current.map((item) => item.id === updated.id ? updated : item));
      return;
    }
    setBusy(true); setError("");
    try { await updateRecoveryCase(accessToken, selected.id, { is_closed: !selected.is_closed }); await refresh(selected.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : tr("Không cập nhật được trạng thái.", "Could not update status.")); }
    finally { setBusy(false); }
  }

  const latest = selected?.check_ins?.at(-1) ?? null;
  const usedIds = new Set([selected?.baseline_diagnosis?.id, ...(selected?.check_ins ?? []).map((entry) => entry.diagnosis?.id)]);
  const available = diagnoses.filter((item) => /^\d+$/.test(item.id) && item.classificationReady && item.plant.toLocaleLowerCase() === selected?.plant_name.toLocaleLowerCase() && !usedIds.has(Number(item.id)));

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6 text-ink">
      {demo ? <div className="rounded-lg border border-sun/30 bg-sun-soft px-4 py-3 text-sm text-warning-ink">{tr("Bản xem thử trên localhost. Ảnh và số liệu chỉ để minh họa; thao tác chỉ thay đổi màn hình này, không lưu vào máy chủ.", "Local preview. Images and data are illustrative; actions only change this screen, not the server.")}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-overline text-leaf-strong">{tr("HỘ CHIẾU PHỤC HỒI", "RECOVERY PASSPORT")}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{tr("Quan sát tiếp, không đoán một lần", "Observe again, not just once")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{tr("Gắn các lần kiểm tra ảnh với cùng một cây hoặc lô vườn để nhìn lại điều gì đã thay đổi sau chăm sóc.", "Keep repeat leaf checks for one plant or plot together to see what changed after care.")}</p>
        </div>
        <Button onClick={() => { setCreating(true); setCheckingIn(false); setError(""); }}><Plus size={18} aria-hidden />{tr("Theo dõi cây mới", "Track a plant")}</Button>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-ink">{error}</div> : null}
      {notice ? <div role="status" className="rounded-lg border border-leaf/30 bg-surface-soft px-4 py-3 text-sm text-leaf-strong">{notice}</div> : null}

      {creating ? (
        <Card padding="lg" className="rounded-xl">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{tr("Bắt đầu một đợt theo dõi", "Start a recovery case")}</h2><button type="button" onClick={() => setCreating(false)} className="flex h-11 w-11 items-center justify-center rounded-lg" aria-label={tr("Đóng", "Close")}><X size={20} /></button></div>
          <p className="mt-2 text-sm text-ink-soft">{tr("Chọn một kết quả ảnh lá đã lưu. Ảnh gốc không được sao chép thêm.", "Choose a saved leaf check. The original photo is not duplicated.")}</p>
          <form onSubmit={startCase} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">{tr("Kết quả đầu tiên", "First check")}<select className={inputClass} value={baselineId} onChange={(event) => setBaselineId(event.target.value)} required><option value="">{tr("Chọn kết quả", "Choose result")}</option>{diagnoses.filter((item) => /^\d+$/.test(item.id) && item.classificationReady).map((item) => <option value={item.id} key={item.id}>{item.plant} · {item.disease} · {formatDate(item.createdAt)}</option>)}</select></label>
            <label className="space-y-2 text-sm font-semibold">{tr("Lô vườn (tùy chọn)", "Plot (optional)")}<select className={inputClass} value={plotId} onChange={(event) => setPlotId(event.target.value)}><option value="">{tr("Không gắn lô", "No plot")}</option>{plots.map((plot) => <option value={plot.id} key={plot.id}>{plot.name}</option>)}</select></label>
            <label className="space-y-2 text-sm font-semibold">{tr("Tên đợt theo dõi (tùy chọn)", "Case name (optional)")}<input className={inputClass} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={tr("Ví dụ: Cà chua luống 2", "E.g. Tomato row 2")} /></label>
            <label className="space-y-2 text-sm font-semibold">{tr("Ngày kiểm tra lại", "Next check date")}<input className={inputClass} type="date" min={dateInDays(0)} max={dateInDays(90)} required value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label>
            <div className="sm:col-span-2"><Button disabled={busy || !baselineId}>{busy ? tr("Đang lưu…", "Saving…") : tr("Tạo hộ chiếu", "Create passport")}</Button></div>
          </form>
        </Card>
      ) : null}

      {loading ? <Card padding="lg">{tr("Đang tải đợt theo dõi…", "Loading recovery cases…")}</Card> : null}
      {!loading && !cases.length && !creating ? <Card padding="lg" className="rounded-xl"><Leaf className="text-leaf-strong" size={28} aria-hidden /><h2 className="mt-4 text-xl font-bold">{tr("Chưa có cây nào đang theo dõi", "No recovery cases yet")}</h2><p className="mt-2 text-sm leading-7 text-ink-soft">{tr("Hãy kiểm tra ảnh lá trước, sau đó tạo hộ chiếu từ kết quả.", "Check a leaf first, then create a passport from its result.")}</p><Link href="/dashboard/diagnosis" className={`${buttonVariants({ variant: "secondary" })} mt-5`}>{tr("Kiểm tra ảnh lá", "Check a leaf")}<ArrowRight size={16} aria-hidden /></Link></Card> : null}

      {!loading && cases.length ? <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="flex min-w-0 gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible" aria-label={tr("Các đợt theo dõi", "Recovery cases")}>{cases.map((item) => <button type="button" key={item.id} onClick={() => void chooseCase(item.id)} aria-current={selected?.id === item.id ? "page" : undefined} className={`min-h-16 min-w-[210px] rounded-xl border px-4 py-3 text-left transition xl:min-w-0 ${selected?.id === item.id ? "border-leaf bg-surface-soft" : "border-line bg-surface hover:border-leaf"}`}><span className="block truncate text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs text-ink-soft">{item.plot_name || item.plant_name} · {item.check_in_count} {tr("lần tái kiểm tra", "follow-ups")}</span></button>)}{nextOffset !== null ? <Button variant="secondary" onClick={() => void loadMore()} disabled={busy} className="shrink-0">{tr("Xem thêm", "Load more")}</Button> : null}</nav>
        {selected ? <div className="min-w-0 space-y-5">
          <Card padding="lg" className="rounded-xl">
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-overline text-leaf-strong">{selected.plot_name || selected.plant_name}</p><h2 className="mt-2 break-words font-display text-2xl font-bold sm:text-3xl">{selected.title}</h2><p className="mt-2 flex items-center gap-2 text-sm text-ink-soft"><CalendarDays size={16} aria-hidden />{tr("Kiểm tra tiếp:", "Next check:")} {formatDate(selected.next_check_date)}</p>{!selected.is_closed && selected.next_check_date < dateInDays(0) ? <p className="mt-2 text-sm font-semibold text-warning-ink">{tr("Đã đến hạn chụp lại ảnh lá.", "Time to take another leaf photo.")}</p> : null}</div><span className={`rounded-full px-3 py-1 text-xs font-bold ${selected.is_closed ? "bg-surface-soft text-ink-soft" : "bg-leaf text-on-leaf"}`}>{selected.is_closed ? tr("Đã kết thúc", "Closed") : tr("Đang theo dõi", "Active")}</span></div>
            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2"><PhotoPanel photo={selected.baseline_diagnosis} label={tr("Ảnh ban đầu", "Baseline photo")} eager /><PhotoPanel photo={latest?.diagnosis ?? null} label={tr("Ảnh gần nhất", "Latest photo")} /></div>
            <p className="mt-4 text-xs leading-6 text-ink-soft">{tr("Hai ảnh chỉ hỗ trợ quan sát. Độ tin cậy phân loại không phải thước đo mức độ bệnh hay tốc độ hồi phục.", "The photos support observation. Classification confidence does not measure disease severity or recovery speed.")}</p>
            <div className="mt-5 flex flex-wrap gap-3">{demo ? <Button onClick={() => setCheckingIn(true)} disabled={selected.is_closed}><ImagePlus size={17} aria-hidden />{tr("Thử tái kiểm tra", "Try a follow-up")}</Button> : <Link href={`/dashboard/diagnosis?recovery=${selected.id}`} className={buttonVariants({ variant: "primary" })}><ImagePlus size={17} aria-hidden />{tr("Chụp ảnh tái kiểm tra", "Take follow-up photo")}</Link>}<Button variant="secondary" onClick={() => setCheckingIn((value) => !value)} disabled={selected.is_closed}>{tr("Gắn kết quả đã lưu", "Attach saved check")}</Button><Button variant="tertiary" onClick={() => void toggleClosed()} disabled={busy}>{selected.is_closed ? tr("Mở lại", "Reopen") : tr("Kết thúc", "Close case")}</Button></div>
          </Card>

          {checkingIn ? <Card padding="lg" className="rounded-xl"><h3 className="text-xl font-bold">{tr("Ghi lần tái kiểm tra", "Record a follow-up")}</h3><p className="mt-2 text-sm text-ink-soft">{tr("Tự đánh giá dựa trên quan sát tại vườn; hệ thống không tự kết luận cây đã khỏi bệnh.", "Rate what you observed in the plot; the system does not claim the plant is cured.")}</p><form onSubmit={addCheckIn} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold sm:col-span-2">{tr("Ảnh kiểm tra mới", "New check photo")}<select className={inputClass} value={followupId} onChange={(event) => setFollowupId(event.target.value)} required><option value="">{tr("Chọn kết quả đã lưu", "Select saved check")}</option>{available.map((item) => <option key={item.id} value={item.id}>{item.plant} · {item.disease} · {formatDate(item.createdAt)}</option>)}</select></label>
            <label className="space-y-2 text-sm font-semibold">{tr("Quan sát của bạn", "Your observation")}<select className={inputClass} value={condition} onChange={(event) => setCondition(event.target.value as RecoveryCondition)}><option value="uncertain">{conditionLabel("uncertain", tr)}</option><option value="improving">{conditionLabel("improving", tr)}</option><option value="unchanged">{conditionLabel("unchanged", tr)}</option><option value="worsening">{conditionLabel("worsening", tr)}</option></select></label>
            <label className="space-y-2 text-sm font-semibold">{tr("Số lá có dấu hiệu (nếu đã đếm)", "Affected leaves (if counted)")}<input className={inputClass} type="number" min="0" max="9999" inputMode="numeric" value={affectedLeaves} onChange={(event) => setAffectedLeaves(event.target.value)} /></label>
            <label className="space-y-2 text-sm font-semibold sm:col-span-2">{tr("Đã chăm sóc thế nào?", "Care already taken")}<textarea className={inputClass} rows={2} maxLength={500} value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} /></label>
            <label className="space-y-2 text-sm font-semibold sm:col-span-2">{tr("Ghi chú quan sát", "Observation notes")}<textarea className={inputClass} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <label className="space-y-2 text-sm font-semibold">{tr("Ngày kiểm tra tiếp", "Next check date")}<input className={inputClass} type="date" min={dateInDays(0)} max={dateInDays(90)} value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label>
            <label className="flex min-h-11 items-center gap-3 text-sm leading-6 sm:col-span-2"><input type="checkbox" checked={sameSubjectConfirmed} onChange={(event) => setSameSubjectConfirmed(event.target.checked)} className="h-5 w-5 accent-[var(--leaf)]" required /><span>{tr("Tôi xác nhận ảnh mới chụp cùng cây hoặc cùng khu vực với ảnh đầu.", "I confirm this photo shows the same plant or plot area as the first one.")}</span></label>
            <div className="flex items-end"><Button disabled={busy || !followupId || !sameSubjectConfirmed}><Check size={17} aria-hidden />{busy ? tr("Đang lưu…", "Saving…") : tr("Lưu lần tái kiểm tra", "Save follow-up")}</Button></div>
          </form></Card> : null}

          <Card padding="lg" className="rounded-xl"><h3 className="text-xl font-bold">{tr("Dòng thời gian quan sát", "Observation timeline")}</h3><ol className="mt-5 space-y-4 border-l-2 border-line pl-5"><li className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-leaf" /><p className="text-xs font-semibold text-leaf-strong">{tr("LẦN ĐẦU", "BASELINE")} · {formatDate(selected.created_at)}</p><p className="mt-1 font-semibold">{selected.baseline_diagnosis?.disease_name || tr("Ảnh ban đầu", "First photo")}</p></li>{selected.check_ins?.map((entry) => <li className="relative" key={entry.id}><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-leaf" /><p className="text-xs font-semibold text-leaf-strong">{formatDate(entry.created_at)} · {conditionLabel(entry.condition, tr)}</p><p className="mt-1 font-semibold">{entry.diagnosis?.disease_name || tr("Ảnh tái kiểm tra", "Follow-up photo")}</p>{entry.affected_leaves !== null ? <p className="mt-1 text-sm text-ink-soft">{tr("Lá có dấu hiệu:", "Affected leaves:")} {entry.affected_leaves}</p> : null}{entry.action_taken ? <p className="mt-1 break-words text-sm text-ink-soft">{tr("Đã làm:", "Care:")} {entry.action_taken}</p> : null}{entry.note ? <p className="mt-1 break-words text-sm text-ink-soft">{entry.note}</p> : null}</li>)}</ol></Card>
        </div> : <Card padding="lg">{busy ? tr("Đang mở…", "Opening…") : tr("Chọn một đợt theo dõi.", "Choose a recovery case.")}</Card>}
      </div> : null}
    </div>
  );
}
