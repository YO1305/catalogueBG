import type { FillPlan } from "@/lib/mockup/fill";
import type { PreviewRequest, PreviewResponse } from "@/lib/mockup/preview.worker";
import type { RenderOptions } from "@/lib/mockup/uvgridRender";

export const PREVIEW_SCALE = 0.4;

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (image: ImageData) => void; reject: (error: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./preview.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
    const data = event.data;
    const entry = waiting.get(data.id);
    if (!entry) return;
    waiting.delete(data.id);
    if (data.ok) entry.resolve(new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height));
    else entry.reject(new Error(data.error));
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Ошибка рендера превью");
    for (const entry of waiting.values()) entry.reject(error);
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Renders in a Web Worker so sliders and page navigation never wait for the mockup. */
export function renderPreview(input: { jsonUrl: string; backgroundUrl: string; plan: FillPlan; opts: RenderOptions }): Promise<ImageData> {
  const id = nextId;
  nextId += 1;
  const request: PreviewRequest = { id, ...input, opts: { ...input.opts, outputScale: PREVIEW_SCALE } };
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    getWorker().postMessage(request);
  });
}
