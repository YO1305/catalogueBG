import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { dominantColors } from "@/lib/colors";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { saveBuffer } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "file" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return Response.json({ error: "file" }, { status: 400 });
  const type = file.type;
  if (!["image/jpeg", "image/png", "image/tiff", "image/webp"].includes(type) && !file.name.match(/\.tiff?$/i)) {
    return Response.json({ error: "file" }, { status: 400 });
  }
  const original = Buffer.from(await file.arrayBuffer());
  const image = sharp(original, { limitInputPixels: false }).rotate();
  const meta = await image.metadata();
  const id = crypto.randomUUID();
  const web = await image.clone().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const thumb = await image.clone().resize({ width: 400, height: 400, fit: "cover" }).webp({ quality: 78 }).toBuffer();
  const mid = await image.clone().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const small = await image.clone().resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const [originalUrl, webUrl, thumbUrl] = await Promise.all([
    saveBuffer(`uploads/${id}/original${ext(file.name)}`, original, type || "application/octet-stream"),
    saveBuffer(`uploads/${id}/web.webp`, web, "image/webp"),
    saveBuffer(`uploads/${id}/thumb.webp`, thumb, "image/webp"),
  ]);
  await saveBuffer(`uploads/${id}/web-1200.webp`, mid, "image/webp");
  await saveBuffer(`uploads/${id}/web-600.webp`, small, "image/webp");
  const colors = await dominantColors(web);
  return Response.json({ originalUrl, webUrl, thumbUrl, widthPx: meta.width ?? 0, heightPx: meta.height ?? 0, colors });
}

function ext(name: string) {
  const match = name.match(/\.(jpe?g|png|tiff?|webp)$/i);
  return match ? match[0].toLowerCase() : ".bin";
}
