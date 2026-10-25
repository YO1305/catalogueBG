import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { RGBA, TemplateJson, ZoneLayers } from "@/lib/mockup/uvgridRender";

export async function readBytes(url: string): Promise<Buffer> {
  if (url.startsWith("/")) return readFile(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Не загрузился файл ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Raw RGBA as is; size is forced only for the background, which must match template.size. */
export async function readRgba(url: string, size?: [number, number]): Promise<RGBA> {
  let pipeline = sharp(await readBytes(url), { limitInputPixels: false });
  if (size) pipeline = pipeline.resize(size[0], size[1], { fit: "fill" });
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, info.width * info.height * 4) };
}

export type TemplateAssets = { tpl: TemplateJson; background: RGBA; layers: Record<string, ZoneLayers> };

export async function loadTemplateAssets(jsonUrl: string, backgroundUrl: string): Promise<TemplateAssets> {
  const tpl = JSON.parse((await readBytes(jsonUrl)).toString("utf8")) as TemplateJson;
  const [background, zones] = await Promise.all([
    readRgba(backgroundUrl, tpl.size),
    Promise.all(
      tpl.zones.map(async (zone) => {
        const [mask, shade, weave, gloss, light] = await Promise.all([
          readRgba(zone.mask),
          readRgba(zone.shade),
          zone.weave ? readRgba(zone.weave) : undefined,
          zone.gloss ? readRgba(zone.gloss) : undefined,
          zone.light ? readRgba(zone.light) : undefined,
        ]);
        return [zone.id, { mask, shade, weave, gloss, light }] as const;
      }),
    ),
  ]);
  return { tpl, background, layers: Object.fromEntries(zones) };
}
