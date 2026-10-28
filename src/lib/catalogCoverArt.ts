/** Flipbook page height / width (√2, как в useCatalogChrome). */
export const CATALOG_COVER_PAGE_RATIO = 1.414213562;

/** Рекомендуемый размер макета обложки для дизайнера (px). */
export const CATALOG_COVER_ART_WIDTH_PX = 2000;
export const CATALOG_COVER_ART_HEIGHT_PX = Math.round(CATALOG_COVER_ART_WIDTH_PX * CATALOG_COVER_PAGE_RATIO);

const MIN_WIDTH_PX = 800;
const MIN_HEIGHT_PX = Math.round(MIN_WIDTH_PX * CATALOG_COVER_PAGE_RATIO);
const RATIO_TOLERANCE = 0.05;

export type CatalogCoverArtValidation =
  | { ok: true }
  | { ok: false; reason: "ratio" | "tooSmall" };

export function validateCatalogCoverDimensions(widthPx: number, heightPx: number): CatalogCoverArtValidation {
  if (widthPx < MIN_WIDTH_PX || heightPx < MIN_HEIGHT_PX) return { ok: false, reason: "tooSmall" };
  const ratio = heightPx / widthPx;
  const target = CATALOG_COVER_ART_HEIGHT_PX / CATALOG_COVER_ART_WIDTH_PX;
  if (Math.abs(ratio - target) / target > RATIO_TOLERANCE) return { ok: false, reason: "ratio" };
  return { ok: true };
}

export function catalogCoverArtDimensionsText(): string {
  return `${CATALOG_COVER_ART_WIDTH_PX}×${CATALOG_COVER_ART_HEIGHT_PX}`;
}
