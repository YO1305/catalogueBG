import sharp from "sharp";

/** Fast WebP for save: one 1200px master + 800px thumb (effort 0). */
export async function mockupWebpVariants(source: Buffer) {
  const mid = await sharp(source)
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 0 })
    .toBuffer();
  const thumb = await sharp(mid).resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 0 }).toBuffer();
  return { full: mid, mid, thumb };
}
