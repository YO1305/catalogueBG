import sharp from "sharp";

/** Downscale in two steps for sharper WebP (SPEC 5.8.6). */
export async function mockupWebpVariants(source: Buffer) {
  const meta = await sharp(source).metadata();
  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  let pipeline = sharp(source);
  if (long > 1000) {
    const mid = Math.round(long * 0.5);
    pipeline = sharp(await pipeline.resize(mid, mid, { fit: "inside", withoutEnlargement: true }).toBuffer());
  }
  const [full, mid, thumb] = await Promise.all([
    pipeline.clone().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 92 }).toBuffer(),
    pipeline.clone().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer(),
    pipeline.clone().resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
  ]);
  return { full, mid, thumb };
}
