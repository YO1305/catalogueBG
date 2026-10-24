import type { ZipTemplateManifest } from "@/lib/templateZip/types";

/** Longest side at most `maxEdge`, both sides at least 1. */
export function fitRenderSize(srcW: number, srcH: number, maxEdge: number): { width: number; height: number } {
  const width = Math.max(1, Math.round(srcW));
  const height = Math.max(1, Math.round(srcH));
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Scale zone UV grid and pxPerCm when background/masks are rendered at a different size than manifest.size. */
export function scaleManifestForSize(manifest: ZipTemplateManifest, width: number, height: number): ZipTemplateManifest {
  const [sw, sh] = manifest.size;
  if (sw === width && sh === height) return manifest;
  const sx = width / sw;
  const sy = height / sh;
  return {
    ...manifest,
    size: [width, height],
    zones: manifest.zones.map((zone) => ({
      ...zone,
      pxPerCm: zone.pxPerCm * sx,
      uvGrid: {
        ...zone.uvGrid,
        x0: Math.round(zone.uvGrid.x0 * sx),
        y0: Math.round(zone.uvGrid.y0 * sy),
        step: Math.max(1, Math.round(zone.uvGrid.step * sx)),
      },
    })),
  };
}
