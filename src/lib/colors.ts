import "server-only";
import sharp from "sharp";

export async function dominantColors(input: Buffer, count = 5) {
  const { data, info } = await sharp(input).resize(48, 48, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 18 && max > 245) continue;
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const current = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    current.n += 1;
    current.r += r;
    current.g += g;
    current.b += b;
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bucket) => {
      const hex = (value: number) => Math.round(value / bucket.n).toString(16).padStart(2, "0");
      return `#${hex(bucket.r)}${hex(bucket.g)}${hex(bucket.b)}`;
    });
}
