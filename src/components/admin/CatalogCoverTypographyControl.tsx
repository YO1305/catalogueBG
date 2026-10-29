"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Label } from "@/components/ui/field";
import { COVER_DIM_MAX, COVER_OFFSET_MAX, COVER_OFFSET_MIN } from "@/lib/catalogCoverTypography";
import type { CatalogCoverTypography } from "@/types";

const WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

function patchTypo(current: CatalogCoverTypography | undefined, partial: CatalogCoverTypography): CatalogCoverTypography {
  return { ...current, ...partial };
}

export function CatalogCoverTypographyControl({
  value,
  hasCoverImage,
  onChange,
}: {
  value?: CatalogCoverTypography;
  hasCoverImage: boolean;
  onChange: (next: CatalogCoverTypography) => void;
}) {
  const { t } = useI18n();
  const typo = value ?? {};

  return (
    <div className="rounded-sm border border-black/10 bg-white/80 p-3">
      <Label>{t("catalogs.coverTypo")}</Label>
      <p className="mt-1 text-xs text-ink/55">{t("catalogs.coverTypoHint")}</p>

      <div className="mt-4 space-y-4">
        <TypoRow
          label={t("catalogs.coverKicker")}
          weight={typo.kickerWeight ?? 400}
          offset={typo.kickerOffsetPct ?? 0}
          onWeight={(kickerWeight) => onChange(patchTypo(value, { kickerWeight }))}
          onOffset={(kickerOffsetPct) => onChange(patchTypo(value, { kickerOffsetPct }))}
          t={t}
        />
        <TypoRow
          label={t("common.name")}
          weight={typo.titleWeight ?? 600}
          offset={typo.titleOffsetPct ?? 0}
          onWeight={(titleWeight) => onChange(patchTypo(value, { titleWeight }))}
          onOffset={(titleOffsetPct) => onChange(patchTypo(value, { titleOffsetPct }))}
          t={t}
        />
        <TypoRow
          label={t("catalogs.subtitle")}
          weight={typo.subtitleWeight ?? 400}
          offset={typo.subtitleOffsetPct ?? 0}
          onWeight={(subtitleWeight) => onChange(patchTypo(value, { subtitleWeight }))}
          onOffset={(subtitleOffsetPct) => onChange(patchTypo(value, { subtitleOffsetPct }))}
          t={t}
        />
      </div>

      {hasCoverImage ? (
        <>
          <div className="mt-4">
            <Label>{t("catalogs.coverTextOnImage")}</Label>
            <div className="mt-2 flex gap-2">
              {(["dark", "light"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs ${typo.textOnImage === mode || (!typo.textOnImage && mode === "dark") ? "bg-majolica text-paper" : "bg-ink/5"}`}
                  onClick={() => onChange(patchTypo(value, { textOnImage: mode }))}
                >
                  {t(`catalogs.coverTextOnImage.${mode}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label>{t("catalogs.coverImageDim")}</Label>
            <p className="mt-1 text-xs text-ink/50">{t("catalogs.coverImageDimHint")}</p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={COVER_DIM_MAX}
                step={1}
                value={typo.imageDimPct ?? 0}
                className="min-w-0 flex-1"
                aria-label={t("catalogs.coverImageDim")}
                onChange={(event) => onChange(patchTypo(value, { imageDimPct: Number(event.target.value) }))}
              />
              <span className="w-10 shrink-0 text-right font-mono text-sm">{typo.imageDimPct ?? 0}%</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TypoRow({
  label,
  weight,
  offset,
  onWeight,
  onOffset,
  t,
}: {
  label: string;
  weight: number;
  offset: number;
  onWeight: (w: number) => void;
  onOffset: (n: number) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-md bg-ink/[0.03] p-2.5">
      <p className="text-xs font-medium text-ink/70">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-ink/50">{t("catalogs.coverWeight")}</span>
        <select
          className="rounded border border-black/10 bg-white px-2 py-1 text-xs"
          value={weight}
          onChange={(event) => onWeight(Number(event.target.value))}
        >
          {WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {t(`catalogs.coverWeight.${w}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 text-[11px] text-ink/50">{t("catalogs.coverOffsetY")}</span>
        <input
          type="range"
          min={COVER_OFFSET_MIN}
          max={COVER_OFFSET_MAX}
          step={1}
          value={offset}
          className="min-w-0 flex-1"
          aria-label={`${label} ${t("catalogs.coverOffsetY")}`}
          onChange={(event) => onOffset(Number(event.target.value))}
        />
        <span className="w-8 shrink-0 text-right font-mono text-xs">{offset > 0 ? `+${offset}` : offset}</span>
      </div>
    </div>
  );
}
