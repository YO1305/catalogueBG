import { loadRgba } from "@/lib/mockup/loadRgba";
import { pickFabricColor, type RGBA } from "@/lib/mockup/uvgridRender";

const PHOTO_EDGE = 800;
const photos = new Map<string, Promise<RGBA>>();

function photo(url: string): Promise<RGBA> {
  const hit = photos.get(url);
  if (hit) return hit;
  const pending = loadRgba(url, PHOTO_EDGE).catch((error: unknown) => {
    photos.delete(url);
    throw error;
  });
  photos.set(url, pending);
  return pending;
}

export async function autoFabricColor(url: string, correction: number): Promise<string> {
  return pickFabricColor(await photo(url), correction);
}

/** Eyedropper: average of a small square around the click (fx, fy are 0..1 of the shown photo). */
export async function fabricColorAt(url: string, fx: number, fy: number, correction: number): Promise<string> {
  const image = await photo(url);
  const cx = Math.round(fx * (image.width - 1));
  const cy = Math.round(fy * (image.height - 1));
  const radius = 3;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = Math.max(0, cy - radius); y <= Math.min(image.height - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(image.width - 1, cx + radius); x += 1) {
      const index = (y * image.width + x) * 4;
      r += image.data[index];
      g += image.data[index + 1];
      b += image.data[index + 2];
      count += 1;
    }
  }
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round((value / Math.max(count, 1)) * correction))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}
