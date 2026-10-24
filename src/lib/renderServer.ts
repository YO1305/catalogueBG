import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { buildStripeFabricInput, fabricUsesStripes } from "@/lib/uvgrid/buildFabricInput";
import { floatRgbToRgba, renderUvgrid } from "@/lib/uvgrid/render";
import { loadZoneAssetsNode, readPatternRgba } from "@/lib/uvgrid/nodeAssets";
import type { UvgridAreaSetting } from "@/lib/uvgrid/types";
import { tileSizePx } from "@/lib/mockupMath";
import { saveBuffer } from "@/lib/storage";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";
import type { Fabric, Mockup, Template } from "@/types";

async function readUrl(url: string) {
  if (url.startsWith("/")) return readFile(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  return Buffer.from(await response.arrayBuffer());
}

async function readManifest(jsonUrl: string): Promise<ZipTemplateManifest> {
  const buf = await readUrl(jsonUrl);
  return JSON.parse(buf.toString("utf8")) as ZipTemplateManifest;
}

async function renderUvgridMockup(fabric: Fabric, template: Template, mockup: Mockup) {
  const manifest = await readManifest(template.baked.jsonUrl);
  const [srcW, srcH] = manifest.size;
  const maxW = 2000;
  const width = Math.min(maxW, srcW);
  const height = Math.round((width * srcH) / srcW);
  const background = await readUrl(template.baked.backgroundUrl);
  const bgRgba = await sharp(background).resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const zones = await loadZoneAssetsNode(manifest, width, height);
  let fabricInput;
  if (fabricUsesStripes(fabric, template)) {
    fabricInput = buildStripeFabricInput(fabric);
  } else {
    const pattern = await readPatternRgba(fabric.design.webUrl || fabric.design.originalUrl);
    pattern.rapportWidthCm = fabric.rapport.widthCm || 8;
    pattern.rapportHeightCm = fabric.rapport.heightCm || fabric.rapport.widthCm || 8;
    fabricInput = pattern;
  }
  const settings: UvgridAreaSetting[] = mockup.areas.map((area) => ({
    areaId: area.areaId,
    scale: area.scale,
    offsetX: area.offsetX,
    offsetY: area.offsetY,
    rotation: area.rotation,
  }));
  const flat = renderUvgrid({
    manifest,
    width,
    height,
    background: new Uint8ClampedArray(bgRgba.data.buffer, bgRgba.data.byteOffset, width * height * 4),
    zones,
    fabric: fabricInput,
    settings,
    sameForAllAreas: mockup.sameForAllAreas,
  });
  const rgba = floatRgbToRgba(flat, width, height);
  const full = await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } }).webp({ quality: 82 }).toBuffer();
  const thumb = await sharp(full).resize(600, 600, { fit: "inside" }).webp({ quality: 76 }).toBuffer();
  const mid = await sharp(full).resize(1200, 1200, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
  const id = `${fabric.id}-${template.id}-${mockup.productType}`;
  const [url, webUrl, thumbUrl] = await Promise.all([
    saveBuffer(`mockups/${id}.webp`, full, "image/webp"),
    saveBuffer(`mockups/${id}-1200.webp`, mid, "image/webp"),
    saveBuffer(`mockups/${id}-600.webp`, thumb, "image/webp"),
  ]);
  return { ...mockup, url, webUrl, thumbUrl, engine: "uvgrid" as const, generatedAt: new Date().toISOString() };
}

export async function renderFabricMockup(fabric: Fabric, template: Template, mockup: Mockup) {
  if (template.engine === "uvgrid" && template.baked.jsonUrl) {
    return renderUvgridMockup(fabric, template, mockup);
  }
  const background = await readUrl(template.baked.backgroundUrl);
  const meta = await sharp(background).metadata();
  const width = meta.width ?? template.source.widthPx;
  const height = meta.height ?? template.source.heightPx;
  const pattern = await readUrl(fabric.design.webUrl || fabric.design.originalUrl);
  const layers: OverlayOptions[] = [];
  for (const area of template.areas.filter((item) => item.fill)) {
    const setting = mockup.sameForAllAreas ? mockup.areas[0] : mockup.areas.find((item) => item.areaId === area.id);
    const scale = setting?.scale ?? 1;
    const tile = tileSizePx(fabric.rapport, area.pxPerCm, area.soWidthPx, scale);
    const png = await sharp(pattern).resize(Math.max(8, Math.round(tile.w)), Math.max(8, Math.round(tile.h)), { fit: "fill" }).png().toBuffer();
    const points = area.transform.length >= 8 ? area.transform : [0, 0, width, 0, width, height, 0, height];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <pattern id="p" patternUnits="userSpaceOnUse" width="${Math.max(8, tile.w)}" height="${Math.max(8, tile.h)}" patternTransform="translate(${setting?.offsetX ?? 0} ${setting?.offsetY ?? 0}) rotate(${setting?.rotation ?? 0})">
          <image href="data:image/png;base64,${png.toString("base64")}" width="${Math.max(8, tile.w)}" height="${Math.max(8, tile.h)}"/>
        </pattern>
      </defs>
      <polygon points="${pairs(points)}" fill="url(#p)"/>
    </svg>`;
    layers.push({ input: await sharp(Buffer.from(svg)).png().toBuffer() });
  }
  for (const overlay of template.baked.overlays) {
    try {
      const input = await readUrl(overlay.url);
      layers.push({ input, left: Math.round(overlay.x), top: Math.round(overlay.y), blend: blend(overlay.blendMode) });
    } catch {
      // A missing starter overlay should not block the render.
    }
  }
  const full = await sharp(background).resize(2000, 2000, { fit: "inside" }).composite(layers).webp({ quality: 82 }).toBuffer();
  const mid = await sharp(full).resize(1200, 1200, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
  const thumb = await sharp(full).resize(600, 600, { fit: "inside" }).webp({ quality: 76 }).toBuffer();
  const id = `${fabric.id}-${template.id}-${mockup.productType}`;
  const [url, webUrl, thumbUrl] = await Promise.all([
    saveBuffer(`mockups/${id}.webp`, full, "image/webp"),
    saveBuffer(`mockups/${id}-1200.webp`, mid, "image/webp"),
    saveBuffer(`mockups/${id}-600.webp`, thumb, "image/webp"),
  ]);
  return { ...mockup, url, webUrl, thumbUrl, engine: "webgl" as const, generatedAt: new Date().toISOString() };
}

function pairs(values: number[]) {
  const out: string[] = [];
  for (let i = 0; i < values.length; i += 2) out.push(`${values[i]},${values[i + 1]}`);
  return out.join(" ");
}

function blend(mode: string): NonNullable<OverlayOptions["blend"]> {
  if (mode === "multiply") return "multiply";
  if (mode === "screen") return "screen";
  if (mode === "overlay") return "overlay";
  return "over";
}
