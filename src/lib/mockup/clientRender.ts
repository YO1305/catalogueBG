import { saveFabricAction } from "@/lib/actions";
import { uploadPublicBlob } from "@/lib/blob/clientUpload";
import { fillPlan, mockupOptions } from "@/lib/mockup/fill";
import { abortRenderers, renderFinal } from "@/lib/mockup/previewClient";
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
 * Prefer the on-screen preview JPEG (already drawn). Only re-render in the worker
 * when the canvas was empty — that used to take 15–20s and freeze the button.
 */
export async function renderAndSave(
  fabric: Fabric,
  template: Template,
  mockup: Mockup,
  variantId?: string,
  opts?: { persisted?: Fabric; jpeg?: Blob },
): Promise<{ mockup: Mockup; fabric: Fabric }> {
  const persisted = opts?.persisted ?? (await ensureFabricSaved(fabric));
  const variant = variantId ? persisted.variants?.find((item) => item.id === variantId) : undefined;
  if (variantId && !variant) throw new Error("Вариант цвета не найден");
  const source = variant ? variantFabric(persisted, variant) : persisted;
  if (template.engine !== "uvgrid" || !template.baked.jsonUrl) return renderOnServer(persisted, template, mockup, variantId);
  const plan = fillPlan(source);
  if (!plan) throw new Error("Нет рисунка или цвета ткани для макета");
  const blob =
    opts?.jpeg && opts.jpeg.size > 0
      ? opts.jpeg
      : await withTimeout(
          renderFinal({
            jsonUrl: template.baked.jsonUrl,
            backgroundUrl: template.baked.backgroundUrl,
            plan,
            opts: mockupOptions(mockup),
          }),
          20_000,
          "Рендер макета занял слишком долго — нажмите ещё раз",
          true,
        );
  const sourceUrl = await withTimeout(
    uploadPublicBlob(`mockups/${persisted.id}/${crypto.randomUUID()}.jpg`, blob),
    20_000,
    "Загрузка макета заняла слишком долго — нажмите ещё раз",
  );
  const response = await withTimeout(
    fetch("/api/mockups/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl, fabricId: persisted.id, variantId, mockup }),
    }),
    20_000,
    "Не удалось записать макет — нажмите ещё раз",
  );
  const data = (await response.json().catch(() => ({}))) as Saved;
  if (!response.ok || !data.ok || !data.mockup) throw new Error(data.error ?? `Макет не сохранился: ${response.status}`);
  return { mockup: data.mockup, fabric: persisted };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string, abortWorker = false): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (abortWorker) abortRenderers();
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
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
