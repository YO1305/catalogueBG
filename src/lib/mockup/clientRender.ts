import { fillPlan, mockupOptions } from "@/lib/mockup/fill";
import { renderFinal } from "@/lib/mockup/previewClient";
import { variantFabric } from "@/lib/variants";
import type { Fabric, Mockup, Template } from "@/types";

type Saved = { ok?: boolean; error?: string; mockup?: Mockup; fabrics?: { fabricId: string; mockups: Mockup[]; variants?: Fabric["variants"] }[] };

/**
 * ZIP templates are rendered in the browser worker and only uploaded, so the server never
 * spends seconds of CPU on a mockup (that blocked page navigation after publishing).
 */
export async function renderAndSave(fabric: Fabric, template: Template, mockup: Mockup, variantId?: string): Promise<Mockup> {
  const variant = variantId ? fabric.variants?.find((item) => item.id === variantId) : undefined;
  if (variantId && !variant) throw new Error("Вариант цвета не найден");
  const source = variant ? variantFabric(fabric, variant) : fabric;
  if (template.engine !== "uvgrid" || !template.baked.jsonUrl) return renderOnServer(fabric.id, template, mockup, variantId);
  const plan = fillPlan(source);
  if (!plan) throw new Error("Нет рисунка или цвета ткани для макета");
  const blob = await renderFinal({ jsonUrl: template.baked.jsonUrl, backgroundUrl: template.baked.backgroundUrl, plan, opts: mockupOptions(mockup) });
  const body = new FormData();
  body.append("file", blob, "mockup.jpg");
  body.append("fabricId", fabric.id);
  if (variantId) body.append("variantId", variantId);
  body.append("mockup", JSON.stringify(mockup));
  const response = await fetch("/api/mockups/save", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as Saved;
  if (!response.ok || !data.ok || !data.mockup) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
  return data.mockup;
}

async function renderOnServer(fabricId: string, template: Template, mockup: Mockup, variantId?: string): Promise<Mockup> {
  const response = await fetch("/api/mockups/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fabricId, templateId: template.id, variantId }),
  });
  const data = (await response.json().catch(() => ({}))) as Saved;
  if (!response.ok || !data.ok) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
  const row = data.fabrics?.find((item) => item.fabricId === fabricId);
  const list = variantId ? row?.variants?.find((item) => item.id === variantId)?.mockups : row?.mockups;
  const saved = list?.find((item) => item.templateId === template.id && item.productType === mockup.productType);
  if (!saved) throw new Error("Макет не сохранился");
  return saved;
}
