import type { ZipTemplateManifest } from "@/lib/templateZip/types";
import { resolveBackgroundBasename } from "@/lib/templateZip/validate";

export function collectManifestAssetPaths(manifest: ZipTemplateManifest, fileNames: Set<string>, templateJsonPath: string): string[] {
  const paths = new Set<string>();
  const bg = resolveBackgroundBasename(fileNames);
  if (bg) paths.add(bg);
  paths.add(templateJsonPath);
  for (const zone of manifest.zones) {
    paths.add(zone.mask);
    paths.add(zone.shade);
    if (zone.weave) paths.add(zone.weave);
    if (zone.gloss) paths.add(zone.gloss);
    if (zone.light) paths.add(zone.light);
  }
  return [...paths];
}
