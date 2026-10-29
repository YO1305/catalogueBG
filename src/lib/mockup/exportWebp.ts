import sharp from "sharp";

/** Downscale once, then three WebP sizes (SPEC 5.8.6). */
export async function mockupWebpVariants(source: Buffer) {
  const base = sharp(source).rotate();
  const meta = await base.metadata();
  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  const prepared =
    long > 2000
      ? sharp(await base.resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).toBuffer())
      : base;
  const [full, mid, thumb] = await Promise.all([
    prepared.clone().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
    prepared.clone().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(),
    prepared.clone().resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
  ]);
  return { full, mid, thumb };
}
