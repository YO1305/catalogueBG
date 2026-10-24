import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { UvgridFabricInput, UvgridZoneAssets } from "@/lib/uvgrid/types";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";

export async function readBytes(url: string) {
  if (url.startsWith("/")) return readFile(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  if (/^[a-zA-Z]:\\/.test(url) || url.startsWith("\\\\")) return readFile(url);
  if (path.isAbsolute(url)) return readFile(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  return Buffer.from(await response.arrayBuffer());
}

async function readGray(url: string, width: number, height: number) {
  const buf = await readBytes(url);
  const raw = await sharp(buf).resize(width, height, { fit: "fill" }).greyscale().raw().toBuffer();
  return new Uint8ClampedArray(raw);
}

export async function readBackgroundRgba(url: string, width: number, height: number) {
  const buf = await readBytes(url);
  const { data, info } = await sharp(buf).resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return new Uint8ClampedArray(data.buffer, data.byteOffset, info.width * info.height * 4);
}

export async function readPatternRgba(url: string): Promise<Extract<UvgridFabricInput, { mode: "pattern" }>> {
  const buf = await readBytes(url);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    mode: "pattern",
    rgba: new Uint8ClampedArray(data.buffer, data.byteOffset, info.width * info.height * 4),
    widthPx: info.width,
    heightPx: info.height,
    rapportWidthCm: 8,
    rapportHeightCm: 8,
  };
}

export async function loadZoneAssetsNode(manifest: ZipTemplateManifest, width: number, height: number): Promise<UvgridZoneAssets[]> {
  return Promise.all(
    manifest.zones.map(async (zone) => ({
      zone,
      mask: await readGray(zone.mask, width, height),
      shade: await readGray(zone.shade, width, height),
      weave: zone.weave ? await readGray(zone.weave, width, height) : undefined,
      gloss: zone.gloss ? await readGray(zone.gloss, width, height) : undefined,
    })),
  );
}
