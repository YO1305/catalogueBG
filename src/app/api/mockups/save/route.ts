import { revalidatePath, revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { catalogCacheTag } from "@/lib/catalogMeta";
import { getFabric, listCatalogsTouchingFabric, saveFabric } from "@/lib/db";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { placeMockup } from "@/lib/variants";
import type { Mockup } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { webUrl?: string; thumbUrl?: string; fabricId?: string; variantId?: string; mockup?: Mockup | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Нет файла макета или ткани" }, { status: 400 });
  }
  const fabricId = String(body.fabricId ?? "");
  const settings = body.mockup ?? null;
  const webUrl = String(body.webUrl ?? "").trim();
  const thumbUrl = String(body.thumbUrl ?? webUrl).trim();
  if (!fabricId || !settings?.templateId || !webUrl.startsWith("http") || !thumbUrl.startsWith("http")) {
    return Response.json({ error: "Нет файла макета или ткани" }, { status: 400 });
  }
  const fabric = await getFabric(fabricId);
  if (!fabric) return Response.json({ error: "Ткань не найдена — сохраните черновик" }, { status: 404 });
  const mockup: Mockup = {
    ...settings,
    url: webUrl,
    webUrl,
    thumbUrl,
    engine: "uvgrid",
    generatedAt: new Date().toISOString(),
  };
  const variantId = String(body.variantId ?? "") || undefined;
  const next = { ...placeMockup(fabric, mockup, variantId), updatedAt: new Date().toISOString() };
  await saveFabric(next);
  const catalogs = await listCatalogsTouchingFabric(next);
  for (const catalog of catalogs) {
    revalidateTag(catalogCacheTag(catalog.slug));
    revalidatePath(`/c/${catalog.slug}`);
  }
  return Response.json({ ok: true, mockup });
}
