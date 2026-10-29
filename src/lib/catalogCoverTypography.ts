import type { CatalogCoverTypography } from "@/types";

export const COVER_KICKER_WEIGHT_MIN = 300;
export const COVER_KICKER_WEIGHT_MAX = 800;
export const COVER_OFFSET_MIN = -30;
export const COVER_OFFSET_MAX = 30;
export const COVER_DIM_MAX = 50;

export type ResolvedCoverTypography = {
  kickerWeight: number;
  titleWeight: number;
  subtitleWeight: number;
  kickerTopPct: number;
  titleTopPct: number;
  subtitleTopPct: number;
  imageDimPct: number;
  textOnImage: "light" | "dark";
};

const DEFAULTS: ResolvedCoverTypography = {
  kickerWeight: 400,
  titleWeight: 600,
  subtitleWeight: 400,
  kickerTopPct: 10,
  titleTopPct: 38,
  subtitleTopPct: 52,
  imageDimPct: 0,
  textOnImage: "dark",
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function weight(raw: number | undefined, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return clamp(Math.round(raw / 100) * 100, COVER_KICKER_WEIGHT_MIN, COVER_KICKER_WEIGHT_MAX);
}

function offset(raw: number | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return clamp(Math.round(raw), COVER_OFFSET_MIN, COVER_OFFSET_MAX);
}

export function resolveCoverTypography(input?: CatalogCoverTypography): ResolvedCoverTypography {
  return {
    kickerWeight: weight(input?.kickerWeight, DEFAULTS.kickerWeight),
    titleWeight: weight(input?.titleWeight, DEFAULTS.titleWeight),
    subtitleWeight: weight(input?.subtitleWeight, DEFAULTS.subtitleWeight),
    kickerTopPct: clamp(DEFAULTS.kickerTopPct + offset(input?.kickerOffsetPct), 0, 90),
    titleTopPct: clamp(DEFAULTS.titleTopPct + offset(input?.titleOffsetPct), 0, 92),
    subtitleTopPct: clamp(DEFAULTS.subtitleTopPct + offset(input?.subtitleOffsetPct), 0, 95),
    imageDimPct: clamp(typeof input?.imageDimPct === "number" ? Math.round(input.imageDimPct) : DEFAULTS.imageDimPct, 0, COVER_DIM_MAX),
    textOnImage: input?.textOnImage === "light" ? "light" : "dark",
  };
}
