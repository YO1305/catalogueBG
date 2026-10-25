import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { getFabric, saveFabric } from "@/lib/db";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { saveBuffer } from "@/lib/storage";
import { placeMockup } from "@/lib/variants";
import type { Mockup } from "@/types";

export const runtime = "nodejs";

/** The browser renders the mockup; here it only becomes WebP sizes and is written into the fabric. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  const fabricId = String(form.get("fabricId") ?? "");
  const variantId = String(form.get("variantId") ?? "") || undefined;
  const settings = JSON.parse(String(form.get("mockup") ?? "null")) as Mockup | null;
  if (!(file instanceof Blob) || !fabricId || !settings?.templateId) return Response.json({ error: "Нет файла макета или ткани" }, { status: 400 });
  const fabric = await getFabric(fabricId);
  if (!fabric) return Response.json({ error: "Ткань не найдена — сохраните черновик" }, { status: 404 });

  const source = Buffer.from(await file.arrayBuffer());
  const [full, mid, thumb] = await Promise.all([
    sharp(source).resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    sharp(source).resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    sharp(source).resize(600, 600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toBuffer(),
  ]);
  const id = [fabricId, variantId, settings.templateId, settings.productType, Date.now().toString(36)].filter(Boolean).join("-");
  const [url, webUrl, thumbUrl] = await Promise.all([
    saveBuffer(`mockups/${id}.webp`, full, "image/webp"),
    saveBuffer(`mockups/${id}-1200.webp`, mid, "image/webp"),
    saveBuffer(`mockups/${id}-600.webp`, thumb, "image/webp"),
  ]);
  const mockup: Mockup = { ...settings, url, webUrl, thumbUrl, engine: "uvgrid", generatedAt: new Date().toISOString() };
  const fresh = (await getFabric(fabricId)) ?? fabric;
  await saveFabric({ ...placeMockup(fresh, mockup, variantId), updatedAt: new Date().toISOString() });
  return Response.json({ ok: true, mockup });
}
