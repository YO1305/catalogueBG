"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Label } from "@/components/ui/field";
import { FABRIC_MODAL_SCALE_MAX, FABRIC_MODAL_SCALE_MIN, fabricModalScaleFactor } from "@/lib/fabricModalLayout";

const PRESETS = [
  { id: "s", value: 90 },
  { id: "m", value: 100 },
  { id: "l", value: 115 },
  { id: "xl", value: 130 },
] as const;

export function CatalogFabricModalSizeControl({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const { t } = useI18n();
  const factor = fabricModalScaleFactor({ fabricModalScale: value });
  const previewW = Math.round(168 * factor);
  const previewH = Math.round(112 * factor);

  return (
    <div className="rounded-sm border border-black/10 bg-white/80 p-3">
      <Label>{t("catalogs.fabricModalSize")}</Label>
      <p className="mt-1 text-xs text-ink/55">{t("catalogs.fabricModalSizeHint")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${value === preset.value ? "bg-majolica text-paper" : "bg-ink/5"}`}
            onClick={() => onChange(preset.value)}
          >
            {t(`catalogs.fabricModalPreset.${preset.id}`)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={FABRIC_MODAL_SCALE_MIN}
          max={FABRIC_MODAL_SCALE_MAX}
          step={1}
          value={value}
          className="min-w-0 flex-1"
          aria-label={t("catalogs.fabricModalSize")}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="w-12 shrink-0 text-right font-mono text-sm">{value}%</span>
      </div>
      <div className="mt-4 flex items-center justify-center rounded-lg bg-[#ebe4d8]/60 p-4">
        <div
          className="rounded-xl border-2 border-majolica/40 bg-paper shadow-md transition-all duration-200"
          style={{ width: previewW, height: previewH }}
          aria-hidden
        >
          <div className="grid h-full grid-cols-2 gap-1 p-2">
            <div className="rounded-md bg-[#ebe4d8]" />
            <div className="rounded-md bg-[#ebe4d8]/70" />
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink/50">{t("catalogs.fabricModalPreviewHint")}</p>
    </div>
  );
}
