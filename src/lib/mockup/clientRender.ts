import { saveFabricAction } from "@/lib/actions";
import { uploadPublicBlob } from "@/lib/blob/clientUpload";
import { fillPlan, mockupOptions } from "@/lib/mockup/fill";
import { abortRenderers, renderFinal } from "@/lib/mockup/previewClient";
import { variantFabric } from "@/lib/variants";
import type { Fabric, Mockup, Template } from "@/types";

export type MockupSaveStep = "render" | "upload1" | "upload2" | "save";

type Saved = { ok?: boolean; error?: string; mockup?: Mockup; fabrics?: { fabricId: string; mockups: Mockup[]; variants?: Fabric["variants"] }[] };

async function ensureFabricSaved(fabric: Fabric): Promise<Fabric> {
  if (fabric.persisted) return fabric;
  const status = fabric.status === "published" ? "published" : "draft";
  const result = await saveFabricAction({ ...fabric, status });
  if (!result.ok) {
    if (result.error === "art_taken") throw new Error("Артикул уже занят — измените артикул и сохраните черновик");
    throw new Error("Сохраните черновик перед сохранением макета");
  }
  return { ...result.fabric, persisted: true };
}

export async function renderAndSave(
  fabric: Fabric,
  template: Template,
  mockup: Mockup,
  variantId?: string,
  opts?: { persisted?: Fabric; onProgress?: (step: MockupSaveStep) => void; signal?: AbortSignal },
): Promise<{ mockup: Mockup; fabric: Fabric }> {
  const controller = new AbortController();
  const onAbort = () => {
    abortRenderers();
    controller.abort();
  };
  const outer = opts?.signal;
  if (outer?.aborted) onAbort();
  outer?.addEventListener("abort", onAbort, { once: true });
  const timer = window.setTimeout(onAbort, 60_000);
  const signal = controller.signal;
  try {
    const persisted = opts?.persisted?.persisted ? opts.persisted : await ensureFabricSaved(opts?.persisted ?? fabric);
    const variant = variantId ? persisted.variants?.find((item) => item.id === variantId) : undefined;
    if (variantId && !variant) throw new Error("Вариант цвета не найден");
    if (template.engine !== "uvgrid" || !template.baked.jsonUrl) return renderOnServer(persisted, template, mockup, variantId, signal);
    const source = variant ? variantFabric(persisted, variant) : persisted;
    const plan = fillPlan(source);
    if (!plan) throw new Error("Нет рисунка или цвета ткани для макета");
    throwIfAborted(signal);
    opts?.onProgress?.("render");
    const blobs = await renderFinal({
      jsonUrl: template.baked.jsonUrl,
      backgroundUrl: template.baked.backgroundUrl,
      plan,
      opts: mockupOptions(mockup),
    });
    throwIfAborted(signal);
    const id = crypto.randomUUID();
    opts?.onProgress?.("upload1");
    const webUrl = await uploadPublicBlob(`mockups/${persisted.id}/${id}-1200.webp`, blobs.web, { signal });
    throwIfAborted(signal);
    opts?.onProgress?.("upload2");
    const thumbUrl = await uploadPublicBlob(`mockups/${persisted.id}/${id}-600.webp`, blobs.thumb, { signal });
    throwIfAborted(signal);
    opts?.onProgress?.("save");
    const response = await fetch("/api/mockups/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webUrl, thumbUrl, fabricId: persisted.id, variantId, mockup }),
      signal,
    });
    const data = (await response.json().catch(() => ({}))) as Saved;
    if (!response.ok || !data.ok || !data.mockup) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
    return { mockup: data.mockup, fabric: persisted };
  } finally {
    window.clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
}

async function renderOnServer(
  fabric: Fabric,
  template: Template,
  mockup: Mockup,
  variantId: string | undefined,
  signal: AbortSignal,
): Promise<{ mockup: Mockup; fabric: Fabric }> {
  const response = await fetch("/api/mockups/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fabricId: fabric.id, templateId: template.id, variantId }),
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as Saved;
  if (!response.ok || !data.ok) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
  const row = data.fabrics?.find((item) => item.fabricId === fabric.id);
  const list = variantId ? row?.variants?.find((item) => item.id === variantId)?.mockups : row?.mockups;
  const saved = list?.find((item) => item.templateId === template.id && item.productType === mockup.productType);
  if (!saved) throw new Error("Макет не сохранился");
  return { mockup: saved, fabric };
}
