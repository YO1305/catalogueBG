import type { FillPlan } from "@/lib/mockup/fill";
import type { PreviewRequest, PreviewResponse } from "@/lib/mockup/preview.worker";
import type { RenderOptions } from "@/lib/mockup/uvgridRender";

/** Admin preview: closer to full render so folds and shade read clearly (still faster than 1.0). */
export const PREVIEW_SCALE = 0.75;

type Input = { jsonUrl: string; backgroundUrl: string; plan: FillPlan; opts: RenderOptions };
type Done = Extract<PreviewResponse, { ok: true }>;

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (data: Done) => void; reject: (error: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./preview.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
    const data = event.data;
    const entry = waiting.get(data.id);
    if (!entry) return;
    waiting.delete(data.id);
    if (data.ok) entry.resolve(data);
    else entry.reject(new Error(data.error));
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Ошибка рендера макета");
    for (const entry of waiting.values()) entry.reject(error);
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function send(request: Omit<PreviewRequest, "id">): Promise<Done> {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    getWorker().postMessage({ id, ...request } satisfies PreviewRequest);
  });
}

/** Renders in a Web Worker so sliders and page navigation never wait for the mockup. */
export async function renderPreview(input: Input): Promise<ImageData> {
  const data = await send({ ...input, opts: { ...input.opts, outputScale: PREVIEW_SCALE } });
  if (!("buffer" in data)) throw new Error("Ошибка рендера превью");
  return new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
}

/** Full-size mockup (up to 2000 px) as JPEG, also off the main thread. */
export async function renderFinal(input: Input): Promise<Blob> {
  const data = await send({ ...input, final: true });
  if (!("blob" in data)) throw new Error("Ошибка рендера макета");
  return data.blob;
}
