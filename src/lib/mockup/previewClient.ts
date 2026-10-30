import type { FillPlan } from "@/lib/mockup/fill";
import type { PreviewRequest, PreviewResponse } from "@/lib/mockup/preview.worker";
import type { RenderOptions } from "@/lib/mockup/uvgridRender";

/** Admin preview: keep under ~0.4 so sliders stay responsive (full size is for save only). */
export const PREVIEW_SCALE = 0.4;

type Input = { jsonUrl: string; backgroundUrl: string; plan: FillPlan; opts: RenderOptions };
type Done = Extract<PreviewResponse, { ok: true }>;

type Slot = {
  worker: Worker | null;
  nextId: number;
  waiting: Map<number, { resolve: (data: Done) => void; reject: (error: Error) => void }>;
  latestPreviewId: number;
};

function emptySlot(): Slot {
  return { worker: null, nextId: 1, waiting: new Map(), latestPreviewId: 0 };
}

/** One worker: preview already warmed the template layers, so save does not reload them. */
const slot = emptySlot();

function abortSlot(target: Slot, message: string) {
  const worker = target.worker;
  target.worker = null;
  const pending = [...target.waiting.values()];
  target.waiting.clear();
  if (worker) {
    worker.onerror = null;
    worker.onmessage = null;
    worker.terminate();
  }
  for (const entry of pending) {
    const error = new Error(message);
    error.name = "AbortError";
    entry.reject(error);
  }
}

function getWorker(target: Slot): Worker {
  if (target.worker) return target.worker;
  const worker = new Worker(new URL("./preview.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
    const data = event.data;
    const entry = target.waiting.get(data.id);
    if (!entry) return;
    target.waiting.delete(data.id);
    if (data.ok) entry.resolve(data);
    else if (data.error === "stale") {
      const abort = new Error("stale");
      abort.name = "AbortError";
      entry.reject(abort);
    } else entry.reject(new Error(data.error));
  };
  worker.onerror = () => {
    abortSlot(target, "Ошибка рендера макета");
  };
  target.worker = worker;
  return worker;
}

function send(request: Omit<PreviewRequest, "id">, kind: "preview" | "final"): Promise<Done> {
  const id = slot.nextId;
  slot.nextId += 1;
  if (kind === "preview") slot.latestPreviewId = id;
  return new Promise((resolve, reject) => {
    const timer =
      kind === "final"
        ? window.setTimeout(() => abortSlot(slot, "Рендер макета занял слишком долго — нажмите ещё раз"), 20_000)
        : 0;
    slot.waiting.set(id, {
      resolve: (data) => {
        if (timer) window.clearTimeout(timer);
        resolve(data);
      },
      reject: (error) => {
        if (timer) window.clearTimeout(timer);
        reject(error);
      },
    });
    try {
      getWorker(slot).postMessage({ id, ...request, dropIfStalePreview: kind === "preview" } satisfies PreviewRequest);
    } catch (error: unknown) {
      slot.waiting.delete(id);
      if (timer) window.clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** Renders in a Web Worker so sliders and page navigation never wait for the mockup. */
export async function renderPreview(input: Input): Promise<ImageData> {
  const data = await send({ ...input, opts: { ...input.opts, outputScale: PREVIEW_SCALE } }, "preview");
  if (!("buffer" in data)) throw new Error("Ошибка рендера превью");
  return new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
}

/** Same worker as preview — template layers are already in memory. */
export async function renderFinal(input: Input): Promise<Blob> {
  const data = await send({ ...input, final: true }, "final");
  if (!("blob" in data)) throw new Error("Ошибка рендера макета");
  return data.blob;
}

export function abortRenderers() {
  abortSlot(slot, "Рендер прерван");
}
