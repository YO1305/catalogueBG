import { revalidatePath, revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { getCatalogs, getFabric, saveFabric } from "@/lib/db";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import { placeMockup } from "@/lib/variants";
import type { Mockup } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Browser already uploaded the JPEG; here we only attach the URL to the fabric. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
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
  const fabric = await getFabric(fabricId);
  if (!fabric) return Response.json({ error: "Ткань не найдена — сохраните черновик" }, { status: 404 });
  const mockup: Mockup = {
    ...settings,
    url: sourceUrl,
    webUrl: sourceUrl,
    thumbUrl: sourceUrl,
    engine: "uvgrid",
    generatedAt: new Date().toISOString(),
  };
  const variantId = String(body.variantId ?? "") || undefined;
  await saveFabric({ ...placeMockup(fabric, mockup, variantId), updatedAt: new Date().toISOString() });
  const catalogs = await getCatalogs();
  for (const catalog of catalogs) {
    if (catalog.status === "archived") continue;
    revalidateTag(`catalog-${catalog.slug}`);
    revalidatePath(`/c/${catalog.slug}`);
  }
  return Response.json({ ok: true, mockup });
}
