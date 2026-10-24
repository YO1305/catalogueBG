import type { ZipTemplateManifest } from "@/lib/templateZip/types";
import type { UvgridZoneAssets } from "@/lib/uvgrid/types";

export async function fetchTemplateManifest(jsonUrl: string): Promise<ZipTemplateManifest> {
  const response = await fetch(jsonUrl);
  if (!response.ok) throw new Error(jsonUrl);
  return (await response.json()) as ZipTemplateManifest;
}

async function loadGrayBitmap(url: string, width: number, height: number): Promise<Uint8ClampedArray> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  try {
    const image = await loadImage(url);
    ctx.drawImage(image, 0, 0, width, height);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(url);
    const bitmap = await createImageBitmap(await response.blob());
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
  }
  const data = ctx.getImageData(0, 0, width, height).data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i += 1) {
    gray[i] = data[i * 4] ?? 0;
  }
  return gray;
}

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(url));
    image.src = url;
  });
}

export async function loadUvgridZoneAssets(manifest: ZipTemplateManifest, width: number, height: number): Promise<UvgridZoneAssets[]> {
  const zones = await Promise.all(
    manifest.zones.map(async (zone) => {
      const mask = await loadGrayBitmap(zone.mask, width, height);
      const shade = await loadGrayBitmap(zone.shade, width, height);
      const weave = zone.weave ? await loadGrayBitmap(zone.weave, width, height) : undefined;
      const gloss = zone.gloss ? await loadGrayBitmap(zone.gloss, width, height) : undefined;
      return { zone, mask, shade, weave, gloss };
    }),
  );
  return zones;
}

export async function loadBackgroundRgba(url: string, width: number, height: number): Promise<Uint8ClampedArray> {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

export async function loadPatternRgba(url: string): Promise<{ rgba: Uint8ClampedArray; widthPx: number; heightPx: number }> {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(image, 0, 0);
  return { rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data, widthPx: canvas.width, heightPx: canvas.height };
}
