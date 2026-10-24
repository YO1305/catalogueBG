import type { ZipTemplateManifest } from "@/lib/templateZip/types";

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
