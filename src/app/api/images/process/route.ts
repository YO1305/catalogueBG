import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { dominantColors } from "@/lib/colors";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { saveBuffer, storageProvider } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

function allowedImageName(name: string, mime?: string) {
  if (mime && ["image/jpeg", "image/png", "image/tiff", "image/webp"].includes(mime)) return true;
  return /\.(jpe?g|png|tiff?|webp)$/i.test(name);
}

function ext(name: string) {
  const match = name.match(/\.(jpe?g|png|tiff?|webp)$/i);
  return match ? match[0].toLowerCase() : ".bin";
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/.test(lower)) return "image/jpeg";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.tiff?$/.test(lower)) return "image/tiff";
  return "application/octet-stream";
}

async function processDesignBuffer(original: Buffer, fileName: string, id: string) {
  const image = sharp(original, { limitInputPixels: false }).rotate();
  let meta;
  try {
    meta = await image.metadata();
  } catch {
    return Response.json({ error: "file" }, { status: 400 });
  }
  const [web, thumb, mid, small] = await Promise.all([
    image.clone().resize({ width: 4000, height: 4000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    image.clone().resize({ width: 400, height: 400, fit: "cover" }).webp({ quality: 78 }).toBuffer(),
    image.clone().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    image.clone().resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
  ]);
  try {
    const skipOriginal = storageProvider() === "vercel-blob";
    const type = mimeFromName(fileName);
    const [webUrl, thumbUrl, , , extraOriginal] = await Promise.all([
      saveBuffer(`private/designs/${id}/web.webp`, web, "image/webp"),
      saveBuffer(`private/designs/${id}/thumb.webp`, thumb, "image/webp"),
      saveBuffer(`private/designs/${id}/web-1200.webp`, mid, "image/webp"),
      saveBuffer(`private/designs/${id}/web-600.webp`, small, "image/webp"),
      skipOriginal
        ? Promise.resolve(null)
        : saveBuffer(`fabrics/${id}/original${ext(fileName)}`, original, type || "application/octet-stream"),
    ]);
    const originalUrl = extraOriginal ?? webUrl;
    const colors = await dominantColors(web);
    return Response.json({ originalUrl, webUrl, thumbUrl, widthPx: meta.width ?? 0, heightPx: meta.height ?? 0, colors });
  } catch (error) {
    console.error("images/process storage", error);
    const message = error instanceof Error ? error.message : "";
    if (/bucket|storage|blob|oidc/i.test(message)) {
      return Response.json({ error: "storage" }, { status: 503 });
    }
    return Response.json({ error: "file" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: { sourceUrl?: string; fileName?: string; designId?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "file" }, { status: 400 });
    }
    const sourceUrl = String(body.sourceUrl ?? "").trim();
    const fileName = String(body.fileName ?? "upload.jpg").trim();
    const id = String(body.designId ?? "").trim() || crypto.randomUUID();
    if (!sourceUrl.startsWith("http")) return Response.json({ error: "file" }, { status: 400 });
    if (!allowedImageName(fileName)) return Response.json({ error: "file" }, { status: 400 });
    const res = await fetch(sourceUrl);
    if (!res.ok) return Response.json({ error: "file" }, { status: 400 });
    const original = Buffer.from(await res.arrayBuffer());
    if (original.length > 50 * 1024 * 1024) return Response.json({ error: "file" }, { status: 400 });
    return processDesignBuffer(original, fileName, id);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "file" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return Response.json({ error: "file" }, { status: 400 });
  if (!allowedImageName(file.name, file.type)) {
    return Response.json({ error: "file" }, { status: 400 });
  }
  const original = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  return processDesignBuffer(original, file.name, id);
}
