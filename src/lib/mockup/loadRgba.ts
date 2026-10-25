import type { RGBA } from "@/lib/mockup/uvgridRender";

/** Browser and Web Worker loader. maxEdge shrinks big photos (colour picking), never template layers. */
export async function loadRgba(url: string, maxEdge?: number): Promise<RGBA> {
  const response = await fetch(url, { mode: "cors", cache: "force-cache" });
  if (!response.ok) throw new Error(`Не загрузился слой ${url}: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  const ratio = maxEdge ? Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height)) : 1;
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не дал canvas для чтения картинки");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context.getImageData(0, 0, width, height);
}

export async function loadRgbaSized(url: string, size: [number, number]): Promise<RGBA> {
  const image = await loadRgba(url);
  if (image.width === size[0] && image.height === size[1]) return image;
  const source = new OffscreenCanvas(image.width, image.height);
  source.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  const canvas = new OffscreenCanvas(size[0], size[1]);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не дал canvas для чтения картинки");
  context.drawImage(source, 0, 0, size[0], size[1]);
  return context.getImageData(0, 0, size[0], size[1]);
}
