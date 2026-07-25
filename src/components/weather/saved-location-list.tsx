"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Pencil, Star, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { fetchFarmPlots, type FarmLocation } from "@/lib/farmops-client";
import { useTr } from "@/lib/use-tr";

/** Plots keep a nullable link to a location; the shared type does not expose it yet. */
type PlotWithLocation = { location?: number | null };

type Tr = (vi: string, en: string) => string;

function coordinateText(location: FarmLocation, tr: Tr) {
  if (location.latitude == null || location.longitude == null) return tr("Chưa có tọa độ", "No coordinates yet");
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function addressText(location: FarmLocation) {
  return [location.address_text, location.ward, location.district, location.province]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function SavedLocationList({
  locations,
  loading,
  selectedId,
  editingId,
  accessToken,
  onSelect,
  onRename,
  onSetDefault,
  onDelete,
}: {
  locations: FarmLocation[];
  loading: boolean;
  selectedId: number | null;
  editingId: number | null;
  accessToken?: string | null;
  onSelect: (location: FarmLocation) => void;
  onRename: (location: FarmLocation, name: string) => Promise<void>;
  onSetDefault: (location: FarmLocation) => Promise<void>;
  onDelete: (location: FarmLocation) => Promise<void>;
}) {
  const tr = useTr();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<FarmLocation | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Plots survive their location (the FK is SET_NULL) but lose location-based
  // alerts, so the confirm step has to say how many are affected.
  const [linkedPlots, setLinkedPlots] = useState<"idle" | "loading" | "failed" | number>("idle");

  useEffect(() => {
    if (!confirmTarget) return;
    if (!accessToken) {
      setLinkedPlots("failed");
      return;
    }

    let active = true;
    setLinkedPlots("loading");
    fetchFarmPlots(accessToken)
      .then((plots) => {
        if (!active) return;
        setLinkedPlots(
          plots.filter((plot) => (plot as unknown as PlotWithLocation).location === confirmTarget.id).length,
        );
      })
      .catch(() => {
        if (active) setLinkedPlots("failed");
      });

    return () => {
      active = false;
    };
  }, [accessToken, confirmTarget]);

  async function runRowAction(location: FarmLocation, action: () => Promise<void>) {
    setBusyId(location.id);
    setRowError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setRowError({
        id: location.id,
        message: err instanceof Error ? err.message : tr("Thao tác không thành công.", "The action failed."),
      });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleRenameSubmit(location: FarmLocation) {
    const name = renameValue.trim();
    if (!name) {
      setRowError({
        id: location.id,
        message: tr("Tên vị trí không được để trống.", "The location name cannot be empty."),
      });
      return;
    }
    const saved = await runRowAction(location, () => onRename(location, name));
    if (saved) setRenamingId(null);
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setDeleting(true);
    try {
      await onDelete(target);
    } catch (err) {
      setRowError({
        id: target.id,
        message: err instanceof Error ? err.message : tr("Không xóa được vị trí.", "Could not delete the location."),
      });
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
    }
  }

  if (loading) {
    return <ListSkeleton count={2} itemClassName="h-[76px]" className="mt-5" />;
  }

  if (!locations.length) {
    return (
      <p className="mt-5 rounded-lg border border-dashed border-line-strong/60 bg-surface-soft p-4 text-body-sm leading-relaxed text-ink-soft">
        {tr(
          "Chưa có vị trí nào được lưu. Điền thông tin phía trên rồi bấm lưu để theo dõi thời tiết tại vườn.",
          "No saved location yet. Fill in the form above and save it to follow the weather at your field.",
        )}
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div>
        <p className="text-caption uppercase tracking-[0.12em] text-ink-soft">{tr("Vị trí đã lưu", "Saved locations")}</p>
        <p className="mt-1 text-caption text-ink-soft">
          {tr(
            "Chọn một vị trí để xem cảnh báo và sửa chi tiết ở biểu mẫu phía trên.",
            "Pick a location to see its alerts and edit the details in the form above.",
          )}
        </p>
      </div>

      {locations.map((location) => {
        const isSelected = selectedId === location.id;
        const isBusy = busyId === location.id;
        const isRenaming = renamingId === location.id;

        return (
          <div
            key={location.id}
            className={`rounded-lg border p-3 transition ${
              isSelected ? "border-leaf/40 bg-surface-soft" : "border-line bg-surface"
            }`}
          >
            {isRenaming ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <Input
                    label={tr("Tên vị trí", "Location name")}
                    value={renameValue}
                    autoFocus
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleRenameSubmit(location);
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  loading={isBusy}
                  disabled={isBusy}
                  onClick={() => void handleRenameSubmit(location)}
                >
                  <Check strokeWidth={1.75} className="h-4 w-4" />
                  {tr("Lưu tên", "Save name")}
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => setRenamingId(null)}>
                  <X strokeWidth={1.75} className="h-4 w-4" />
                  {tr("Hủy", "Cancel")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => onSelect(location)} className="min-w-0 flex-1 text-left" aria-pressed={isSelected}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{location.name}</span>
                    {location.crop_type ? <span className="text-body-sm text-ink-soft">· {location.crop_type}</span> : null}
                    {location.is_default ? <Badge variant="success">{tr("Mặc định", "Default")}</Badge> : null}
                    {editingId === location.id ? <Badge variant="muted">{tr("Đang sửa", "Editing")}</Badge> : null}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-caption text-ink-soft">
                    <MapPin strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
                    {addressText(location) || coordinateText(location, tr)}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="iconSm"
                    disabled={isBusy}
                    title={tr("Đổi tên vị trí", "Rename location")}
                    aria-label={tr("Đổi tên vị trí", "Rename location")}
                    onClick={() => {
                      setRowError(null);
                      setRenameValue(location.name);
                      setRenamingId(location.id);
                    }}
                  >
                    <Pencil strokeWidth={1.75} className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="iconSm"
                    disabled={isBusy || location.is_default}
                    title={
                      location.is_default
                        ? tr("Đang là vị trí mặc định", "Already the default location")
                        : tr("Đặt làm vị trí mặc định", "Set as default location")
                    }
                    aria-label={tr("Đặt làm vị trí mặc định", "Set as default location")}
                    onClick={() => void runRowAction(location, () => onSetDefault(location))}
                  >
                    <Star strokeWidth={1.75} className={`h-4 w-4 ${location.is_default ? "text-leaf-strong" : ""}`} />
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="iconSm"
                    disabled={isBusy}
                    title={tr("Xóa vị trí", "Delete location")}
                    aria-label={tr("Xóa vị trí", "Delete location")}
                    onClick={() => {
                      setRowError(null);
                      setLinkedPlots("idle");
                      setConfirmTarget(location);
                    }}
                  >
                    <Trash2 strokeWidth={1.75} className="h-4 w-4 text-danger-ink" />
                  </Button>
                </div>
              </div>
            )}

            {rowError?.id === location.id ? <p className="mt-2 text-body-sm text-danger-ink">{rowError.message}</p> : null}
          </div>
        );
      })}

      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => {
          if (!deleting) setConfirmTarget(null);
        }}
        title={tr("Xóa vị trí này?", "Delete this location?")}
        description={
          confirmTarget
            ? tr(
                `"${confirmTarget.name}" sẽ bị xóa khỏi tài khoản. Không thể hoàn tác.`,
                `"${confirmTarget.name}" will be removed from your account. This cannot be undone.`,
              )
            : undefined
        }
        className="max-w-lg"
      >
        <ul className="space-y-2 text-body-sm leading-relaxed text-ink-soft">
          <li>
            -{" "}
            {tr(
              "Dự báo thời tiết và cảnh báo sâu bệnh theo vị trí này sẽ không còn hiển thị.",
              "The weather forecast and pest alerts for this location will no longer be shown.",
            )}
          </li>
          <li>
            -{" "}
            {linkedPlots === "loading"
              ? tr("Đang kiểm tra lô vườn đang dùng vị trí này...", "Checking which plots use this location...")
              : typeof linkedPlots === "number"
                ? linkedPlots === 0
                  ? tr("Không có lô vườn nào đang gắn với vị trí này.", "No plot is linked to this location.")
                  : tr(
                      `${linkedPlots} lô vườn đang gắn với vị trí này sẽ mất cảnh báo theo vị trí. Lô vườn và nhật ký vẫn được giữ.`,
                      `${linkedPlots} plot(s) linked to this location will lose location-based alerts. The plots and their logs are kept.`,
                    )
                : tr(
                    "Chưa kiểm tra được lô vườn đang dùng vị trí này. Lô vườn và nhật ký không bị xóa, nhưng sẽ mất cảnh báo theo vị trí.",
                    "Could not check which plots use this location. Plots and their logs are kept, but they lose location-based alerts.",
                  )}
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={deleting} onClick={() => setConfirmTarget(null)}>
            {tr("Giữ lại", "Keep it")}
          </Button>
          <Button type="button" variant="danger" loading={deleting} disabled={deleting} onClick={() => void handleConfirmDelete()}>
            <Trash2 strokeWidth={1.75} className="h-4 w-4" />
            {tr("Xóa vị trí", "Delete location")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
