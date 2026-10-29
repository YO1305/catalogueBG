import { saveFabricAction } from "@/lib/actions";
import { uploadPublicBlob } from "@/lib/blob/clientUpload";
import { fillPlan, mockupOptions } from "@/lib/mockup/fill";
import { renderFinal } from "@/lib/mockup/previewClient";
import { variantFabric } from "@/lib/variants";
import type { Fabric, Mockup, Template } from "@/types";

type Saved = { ok?: boolean; error?: string; mockup?: Mockup; fabrics?: { fabricId: string; mockups: Mockup[]; variants?: Fabric["variants"] }[] };

async function ensureFabricSaved(fabric: Fabric): Promise<Fabric> {
  const status = fabric.status === "published" ? "published" : "draft";
  const result = await saveFabricAction({ ...fabric, status });
  if (!result.ok) {
    if (result.error === "art_taken") throw new Error("Артикул уже занят — измените артикул и сохраните черновик");
    throw new Error("Сохраните черновик перед сохранением макета");
  }
  return result.fabric;
}

/**
 * ZIP templates are rendered in the browser worker and only uploaded, so the server never
 * spends seconds of CPU on a mockup (that blocked page navigation after publishing).
 */
export async function renderAndSave(
  fabric: Fabric,
  template: Template,
  mockup: Mockup,
  variantId?: string,
  opts?: { persisted?: Fabric },
): Promise<{ mockup: Mockup; fabric: Fabric }> {
  const persisted = opts?.persisted ?? (await ensureFabricSaved(fabric));
  const variant = variantId ? persisted.variants?.find((item) => item.id === variantId) : undefined;
  if (variantId && !variant) throw new Error("Вариант цвета не найден");
  const source = variant ? variantFabric(persisted, variant) : persisted;
  if (template.engine !== "uvgrid" || !template.baked.jsonUrl) return renderOnServer(persisted, template, mockup, variantId);
  const plan = fillPlan(source);
  if (!plan) throw new Error("Нет рисунка или цвета ткани для макета");
  const blob = await renderFinal({ jsonUrl: template.baked.jsonUrl, backgroundUrl: template.baked.backgroundUrl, plan, opts: mockupOptions(mockup) });
  const uploadName = `${crypto.randomUUID()}.jpg`;
  const sourceUrl = await uploadPublicBlob(`mockups/${persisted.id}/${uploadName}`, blob);
  const response = await fetch("/api/mockups/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl, fabricId: persisted.id, variantId, mockup }),
  });
  const data = (await response.json().catch(() => ({}))) as Saved;
  if (!response.ok || !data.ok || !data.mockup) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
  return { mockup: data.mockup, fabric: persisted };
}

async function renderOnServer(fabric: Fabric, template: Template, mockup: Mockup, variantId?: string): Promise<{ mockup: Mockup; fabric: Fabric }> {
  const response = await fetch("/api/mockups/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fabricId: fabric.id, templateId: template.id, variantId }),
  });
  const data = (await response.json().catch(() => ({}))) as Saved;
  if (!response.ok || !data.ok) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
  const row = data.fabrics?.find((item) => item.fabricId === fabric.id);
  const list = variantId ? row?.variants?.find((item) => item.id === variantId)?.mockups : row?.mockups;
  const saved = list?.find((item) => item.templateId === template.id && item.productType === mockup.productType);
  if (!saved) throw new Error("Макет не сохранился");
  return { mockup: saved, fabric };
}
