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
  /** Preview-only: drop older queued jobs when a newer preview is posted. */
  latestPreviewId: number;
};

function emptySlot(): Slot {
  return { worker: null, nextId: 1, waiting: new Map(), latestPreviewId: 0 };
}

const previewSlot = emptySlot();
const finalSlot = emptySlot();

function getWorker(slot: Slot): Worker {
  if (slot.worker) return slot.worker;
  const worker = new Worker(new URL("./preview.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
    const data = event.data;
    const entry = slot.waiting.get(data.id);
    if (!entry) return;
    slot.waiting.delete(data.id);
    if (data.ok) entry.resolve(data);
    else if (data.error === "stale") {
      const abort = new Error("stale");
      abort.name = "AbortError";
      entry.reject(abort);
    } else entry.reject(new Error(data.error));
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Ошибка рендера макета");
    for (const entry of slot.waiting.values()) entry.reject(error);
    slot.waiting.clear();
    worker.terminate();
    slot.worker = null;
  };
  slot.worker = worker;
  return worker;
}

function send(slot: Slot, request: Omit<PreviewRequest, "id">, kind: "preview" | "final"): Promise<Done> {
  const id = slot.nextId;
  slot.nextId += 1;
  if (kind === "preview") slot.latestPreviewId = id;
  return new Promise((resolve, reject) => {
    slot.waiting.set(id, { resolve, reject });
    getWorker(slot).postMessage({ id, ...request, dropIfStalePreview: kind === "preview" } satisfies PreviewRequest);
  });
}

/** Renders in a Web Worker so sliders and page navigation never wait for the mockup. */
export async function renderPreview(input: Input): Promise<ImageData> {
  const data = await send(previewSlot, { ...input, opts: { ...input.opts, outputScale: PREVIEW_SCALE } }, "preview");
  if (!("buffer" in data)) throw new Error("Ошибка рендера превью");
  return new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
}

/** Full-size mockup on a dedicated worker so save never waits behind preview jobs. */
export async function renderFinal(input: Input): Promise<Blob> {
  const data = await send(finalSlot, { ...input, final: true }, "final");
  if (!("blob" in data)) throw new Error("Ошибка рендера макета");
  return data.blob;
}
