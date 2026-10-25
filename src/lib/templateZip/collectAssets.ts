import type { ZipTemplateManifest } from "@/lib/templateZip/types";

export function collectManifestAssetPaths(manifest: ZipTemplateManifest): string[] {
  const paths = new Set<string>(["background.jpg"]);
  for (const zone of manifest.zones) {
    paths.add(zone.mask);
    paths.add(zone.shade);
    if (zone.weave) paths.add(zone.weave);
    if (zone.gloss) paths.add(zone.gloss);
    if (zone.light) paths.add(zone.light);
  }
  return [...paths];
}
