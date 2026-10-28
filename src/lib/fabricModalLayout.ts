import type { CSSProperties } from "react";
import type { Catalog } from "@/types";

export const FABRIC_MODAL_SCALE_MIN = 85;
export const FABRIC_MODAL_SCALE_MAX = 150;
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
  };
}

/** Square side length for fabric/product tiles inside the modal (scales with catalog setting). */
export function fabricModalTileStyle(factor: number, twoColumns: boolean): CSSProperties {
  const vmin = twoColumns ? 38 : 54;
  const remCap = twoColumns ? 22 : 42;
  const side = `min(100%, calc(${vmin}vmin * ${factor}), calc(${remCap}rem * ${factor}), calc(72vh - 6rem))`;
  return {
    width: side,
    maxWidth: "100%",
    maxHeight: side,
    aspectRatio: "1",
  };
}
