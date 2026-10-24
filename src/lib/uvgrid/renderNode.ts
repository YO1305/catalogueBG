import "server-only";
import sharp from "sharp";
import { loadZoneAssetsNode, readBackgroundRgba } from "@/lib/uvgrid/nodeAssets";
import { floatRgbToRgba, renderUvgrid } from "@/lib/uvgrid/render";
import type { UvgridRenderInput } from "@/lib/uvgrid/types";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";

export async function renderUvgridWebp(input: Omit<UvgridRenderInput, "background" | "zones"> & {
  backgroundUrl: string;
  manifest: ZipTemplateManifest;
}): Promise<Buffer> {
  const [w, h] = input.manifest.size;
  const width = input.width ?? w;
  const height = input.height ?? h;
  const background = await readBackgroundRgba(input.backgroundUrl, width, height);
  const zones = await loadZoneAssetsNode(input.manifest, width, height);
  const flat = renderUvgrid({ ...input, width, height, background, zones });
  const rgba = floatRgbToRgba(flat, width, height);
  return sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } }).webp({ quality: 82 }).toBuffer();
}

export { loadZoneAssetsNode, readBackgroundRgba, readPatternRgba, readBytes } from "@/lib/uvgrid/nodeAssets";
