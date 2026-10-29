import { getSession } from "@/lib/auth";
import { mockupWebpVariants } from "@/lib/mockup/exportWebp";
import { getFabric, saveFabric } from "@/lib/db";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { saveBuffer } from "@/lib/storage";
import { placeMockup } from "@/lib/variants";
import type { Mockup } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

async function readSourceBuffer(request: Request): Promise<{ buffer: Buffer; mockup: Mockup; fabricId: string; variantId?: string } | Response> {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: { sourceUrl?: string; fabricId?: string; variantId?: string; mockup?: Mockup | null };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Нет файла макета или ткани" }, { status: 400 });
    }
    const fabricId = String(body.fabricId ?? "");
    const settings = body.mockup ?? null;
    const sourceUrl = String(body.sourceUrl ?? "").trim();
    if (!fabricId || !settings?.templateId || !sourceUrl.startsWith("http")) {
      return Response.json({ error: "Нет файла макета или ткани" }, { status: 400 });
    }
    const res = await fetch(sourceUrl);
    if (!res.ok) return Response.json({ error: "Не удалось прочитать макет из хранилища" }, { status: 400 });
    const buffer = Buffer.from(await res.arrayBuffer());
    const variantId = String(body.variantId ?? "") || undefined;
    return { buffer, mockup: settings, fabricId, variantId };
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

/** The browser renders the mockup; here it only becomes WebP sizes and is written into the fabric. */
export async function POST(request: Request) {
  const parsed = await readSourceBuffer(request);
  if (parsed instanceof Response) return parsed;
  const { buffer, mockup: settings, fabricId, variantId } = parsed;
  const fabric = await getFabric(fabricId);
  if (!fabric) return Response.json({ error: "Ткань не найдена — сохраните черновик" }, { status: 404 });

  const { full, mid, thumb } = await mockupWebpVariants(buffer);
  const id = [fabricId, variantId, settings.templateId, settings.productType, Date.now().toString(36)].filter(Boolean).join("-");
  const [url, webUrl, thumbUrl] = await Promise.all([
    saveBuffer(`mockups/${id}.webp`, full, "image/webp"),
    saveBuffer(`mockups/${id}-1200.webp`, mid, "image/webp"),
    saveBuffer(`mockups/${id}-800.webp`, thumb, "image/webp"),
  ]);
  const mockup: Mockup = { ...settings, url, webUrl, thumbUrl, engine: "uvgrid", generatedAt: new Date().toISOString() };
  await saveFabric({ ...placeMockup(fabric, mockup, variantId), updatedAt: new Date().toISOString() });
  return Response.json({ ok: true, mockup });
}
