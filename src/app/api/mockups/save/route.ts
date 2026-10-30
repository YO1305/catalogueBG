import { getSession } from "@/lib/auth";
import { getFabric, saveFabric } from "@/lib/db";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { saveBuffer } from "@/lib/storage";
import { placeMockup } from "@/lib/variants";
import type { Mockup } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

async function readSourceBuffer(request: Request): Promise<{ buffer: Buffer; mockup: Mockup; fabricId: string; variantId?: string } | Response> {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const fabricId = String(form.get("fabricId") ?? "");
  const variantId = String(form.get("variantId") ?? "") || undefined;
  const settings = JSON.parse(String(form.get("mockup") ?? "null")) as Mockup | null;
  if (!(file instanceof Blob) || !fabricId || !settings?.templateId) {
    return Response.json({ error: "Нет файла макета или ткани" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, mockup: settings, fabricId, variantId };
}

/** Browser already rendered JPEG — store it once, no Sharp/WebP round-trip. */
export async function POST(request: Request) {
  const parsed = await readSourceBuffer(request);
  if (parsed instanceof Response) return parsed;
  const { buffer, mockup: settings, fabricId, variantId } = parsed;
  const fabric = await getFabric(fabricId);
  if (!fabric) return Response.json({ error: "Ткань не найдена — сохраните черновик" }, { status: 404 });

  const id = [fabricId, variantId, settings.templateId, settings.productType, Date.now().toString(36)].filter(Boolean).join("-");
  const url = await saveBuffer(`mockups/${id}.jpg`, buffer, "image/jpeg");
  const mockup: Mockup = { ...settings, url, webUrl: url, thumbUrl: url, engine: "uvgrid", generatedAt: new Date().toISOString() };
  await saveFabric({ ...placeMockup(fabric, mockup, variantId), updatedAt: new Date().toISOString() });
  return Response.json({ ok: true, mockup });
}
