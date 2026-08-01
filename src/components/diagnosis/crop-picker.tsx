"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search, Sprout } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { DIAGNOSABLE_CROPS, findCrop, normalizeCropKey } from "@/lib/crop-filter";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

/**
 * Lets the grower say which crop they are photographing, so results can be
 * narrowed to that crop's diseases.
 *
 * Every tap target here is at least 44px on its shortest side and the search
 * field is 16px, because anything smaller makes iOS Safari zoom the page on
 * focus and the user then has to pinch back out one-handed in a field.
 */
export function CropPicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (cropId: string | null) => void;
  className?: string;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = findCrop(value);

  const results = useMemo(() => {
    const q = normalizeCropKey(query);
    if (!q) return DIAGNOSABLE_CROPS;
    // Search the folded form so "ca chua", "cà chua" and "tomato" all land.
    return DIAGNOSABLE_CROPS.filter((crop) =>
      crop.keys.some((key) => key.includes(q)) || normalizeCropKey(crop.name).includes(q),
    );
  }, [query]);

  function choose(cropId: string | null) {
    onChange(cropId);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-[48px] w-full items-center gap-3 rounded-[var(--r-md)] border border-line bg-surface px-3 py-2 text-left transition hover:border-line-strong hover:bg-surface-soft",
          className,
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface-soft text-leaf-strong">
          {selected ? (
            <Image src={selected.image} alt="" width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            <Sprout size={18} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            {tr("Cây trồng", "Crop")}
          </span>
          <span className="block truncate text-sm font-semibold text-ink">
            {selected ? tr(selected.name, selected.nameEn) : tr("Tất cả cây trồng", "All crops")}
          </span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-ink-soft" aria-hidden />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Chọn cây trồng", "Choose a crop")}
        description={tr(
          "Chọn cây bạn đang chụp để hệ thống chỉ hiện các bệnh của cây đó. Bỏ trống nếu bạn chưa chắc.",
          "Pick the crop you are photographing and results will be narrowed to that crop's diseases. Leave it unset if you are not sure.",
        )}
        className="max-w-2xl"
      >
        <div className="relative mb-4">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr("Tìm cây trồng…", "Search crops…")}
            aria-label={tr("Tìm cây trồng", "Search crops")}
            // 16px: below that, iOS Safari zooms the viewport on focus.
            className="h-12 w-full rounded-[var(--r-md)] border border-line bg-surface pl-10 pr-3 text-base text-ink placeholder:text-ink-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-[var(--ring-leaf)]"
          />
        </div>

        <button
          type="button"
          onClick={() => choose(null)}
          className={cn(
            "mb-3 flex min-h-[48px] w-full items-center gap-3 rounded-[var(--r-md)] border px-3 py-2 text-left transition",
            value === null
              ? "border-leaf bg-[color-mix(in_srgb,var(--leaf)_12%,transparent)]"
              : "border-line bg-surface hover:bg-surface-soft",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-line bg-surface-soft text-leaf-strong">
            <Sprout size={18} aria-hidden />
          </span>
          <span className="flex-1 text-sm font-semibold text-ink">{tr("Tất cả cây trồng", "All crops")}</span>
          {value === null ? <Check size={18} className="shrink-0 text-leaf-strong" aria-hidden /> : null}
        </button>

        {results.length === 0 ? (
          <p className="rounded-[var(--r-md)] border border-line bg-surface-soft px-4 py-6 text-center text-sm text-ink-soft">
            {tr(
              "Không tìm thấy cây nào khớp. Agromind hiện nhận 21 loại cây.",
              "No crop matches. Agromind currently covers 21 crops.",
            )}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((crop) => {
              const active = crop.id === value;
              return (
                <li key={crop.id}>
                  <button
                    type="button"
                    onClick={() => choose(crop.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-[56px] w-full items-center gap-2.5 rounded-[var(--r-md)] border p-2 text-left transition",
                      active
                        ? "border-leaf bg-[color-mix(in_srgb,var(--leaf)_12%,transparent)]"
                        : "border-line bg-surface hover:bg-surface-soft",
                    )}
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface-soft">
                      <Image
                        src={crop.image}
                        alt=""
                        width={40}
                        height={40}
                        sizes="40px"
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-ink">
                      {tr(crop.name, crop.nameEn)}
                    </span>
                    {active ? <Check size={16} className="shrink-0 text-leaf-strong" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
