import type { CSSProperties } from "react";
import type { Catalog } from "@/types";

export const FABRIC_MODAL_SCALE_MIN = 85;
export const FABRIC_MODAL_SCALE_MAX = 135;
export const FABRIC_MODAL_SCALE_DEFAULT = 100;

export function fabricModalScalePercent(layout: Pick<Catalog["layout"], "fabricModalScale">): number {
  const raw = layout.fabricModalScale;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return FABRIC_MODAL_SCALE_DEFAULT;
  return Math.min(FABRIC_MODAL_SCALE_MAX, Math.max(FABRIC_MODAL_SCALE_MIN, Math.round(raw)));
}

export function fabricModalScaleFactor(layout: Pick<Catalog["layout"], "fabricModalScale">): number {
  return fabricModalScalePercent(layout) / 100;
}

export function fabricModalShellStyle(layout: Pick<Catalog["layout"], "fabricModalScale">): CSSProperties {
  const factor = fabricModalScaleFactor(layout);
  return {
    maxHeight: `min(94vh, ${Math.round(720 * factor)}px)`,
    maxWidth: `min(96vw, ${(74 * factor).toFixed(2)}rem)`,
    minHeight: `min(88vh, ${Math.round(560 * factor)}px)`,
  };
}
