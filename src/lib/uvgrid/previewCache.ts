import {
  fetchTemplateManifest,
  loadBackgroundRgba,
  loadPatternRgba,
  loadUvgridZoneAssets,
} from "@/lib/uvgrid/loadManifest";
import { fitRenderSize, scaleManifestForSize } from "@/lib/uvgrid/scaleManifest";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";
import type { UvgridZoneAssets } from "@/lib/uvgrid/types";

const PREVIEW_MAX_EDGE = 1000;
const MAX_ENTRIES = 12;

type TemplatePreview = {
  manifest: ZipTemplateManifest;
  width: number;
  height: number;
  background: Uint8ClampedArray;
  zones: UvgridZoneAssets[];
};

type Pattern = Awaited<ReturnType<typeof loadPatternRgba>>;

const templates = new Map<string, Promise<TemplatePreview>>();
const patterns = new Map<string, Promise<Pattern>>();

function remember<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return pending;
}

/** Template masks and background decoded once per template, not on every slider move. */
export function templatePreview(jsonUrl: string, backgroundUrl: string): Promise<TemplatePreview> {
  return remember(templates, `${jsonUrl}|${backgroundUrl}`, async () => {
    const raw = await fetchTemplateManifest(jsonUrl);
    const { width, height } = fitRenderSize(raw.size[0], raw.size[1], PREVIEW_MAX_EDGE);
    const manifest = scaleManifestForSize(raw, width, height);
    const [background, zones] = await Promise.all([
      loadBackgroundRgba(backgroundUrl, width, height),
      loadUvgridZoneAssets(manifest, width, height),
    ]);
    return { manifest, width, height, background, zones };
  });
}

export function patternPreview(url: string): Promise<Pattern> {
  return remember(patterns, url, () => loadPatternRgba(url));
}
