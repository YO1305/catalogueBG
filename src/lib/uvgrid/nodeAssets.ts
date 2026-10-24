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

function copyRgba(data: Buffer, width: number, height: number) {
  const expected = width * height * 4;
  if (!width || !height || data.length < expected) throw new Error("rgba_size");
  const out = new Uint8ClampedArray(expected);
  out.set(data.subarray(0, expected));
  return out;
}

async function readGray(url: string, width: number, height: number) {
  const buf = await readBytes(url);
  const raw = await sharp(buf).rotate().resize(width, height, { fit: "fill" }).greyscale().raw().toBuffer();
  const out = new Uint8ClampedArray(width * height);
  out.set(raw.subarray(0, out.length));
  return out;
}

export async function readBackgroundRgba(url: string, width: number, height: number) {
  const buf = await readBytes(url);
  const { data, info } = await sharp(buf).rotate().resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== width || info.height !== height) throw new Error("rgba_size");
  return copyRgba(data, width, height);
}

export async function readPatternRgba(url: string): Promise<Extract<UvgridFabricInput, { mode: "pattern" }>> {
  const buf = await readBytes(url);
  const meta = await sharp(buf, { limitInputPixels: false }).rotate().metadata();
  let pipeline = sharp(buf, { limitInputPixels: false }).rotate();
  if ((meta.width ?? 0) > 2400 || (meta.height ?? 0) > 2400) {
    pipeline = pipeline.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });
  }
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    mode: "pattern",
    rgba: copyRgba(data, info.width, info.height),
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
