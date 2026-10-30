/// <reference lib="webworker" />
import { resolveFill, type FillPlan } from "@/lib/mockup/fill";
import { loadRgba, loadRgbaSized } from "@/lib/mockup/loadRgba";
import { renderUvgrid, type RenderOptions, type RGBA, type TemplateJson, type ZoneLayers } from "@/lib/mockup/uvgridRender";

export type PreviewRequest = {
  id: number;
  jsonUrl: string;
  backgroundUrl: string;
  plan: FillPlan;
  opts: RenderOptions;
  final?: boolean;
  /** When true, skip this job if a newer preview arrived while we were loading. */
  dropIfStalePreview?: boolean;
};
export type PreviewResponse =
  | { id: number; ok: true; width: number; height: number; buffer: ArrayBuffer }
  | { id: number; ok: true; blob: Blob }
  | { id: number; ok: false; error: string; stale?: true };

type Assets = { tpl: TemplateJson; background: RGBA; layers: Record<string, ZoneLayers> };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const templates = new Map<string, Promise<Assets>>();
const images = new Map<string, Promise<RGBA>>();
const KEEP_TEMPLATES = 2;
const KEEP_IMAGES = 6;
/** Long edge for worker fallback. Click-save uses the on-screen preview instead. */
const FINAL_MAX_EDGE = 1200;

let latestPreviewId = 0;
let chain: Promise<void> = Promise.resolve();

function remember<T>(cache: Map<string, Promise<T>>, key: string, keep: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  while (cache.size > keep) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return pending;
}

async function loadTemplate(jsonUrl: string, backgroundUrl: string): Promise<Assets> {
  const response = await fetch(jsonUrl, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Не загрузился template.json: ${response.status}`);
  const tpl = (await response.json()) as TemplateJson;
  const [background, zones] = await Promise.all([
    loadRgbaSized(backgroundUrl, tpl.size),
    Promise.all(
      tpl.zones.map(async (zone) => {
        const [mask, shade, weave, gloss, light] = await Promise.all([
          loadRgba(zone.mask),
          loadRgba(zone.shade),
          zone.weave ? loadRgba(zone.weave) : undefined,
          zone.gloss ? loadRgba(zone.gloss) : undefined,
          zone.light ? loadRgba(zone.light) : undefined,
        ]);
        return [zone.id, { mask, shade, weave, gloss, light }] as const;
      }),
    ),
  ]);
  return { tpl, background, layers: Object.fromEntries(zones) };
}

/** Final mockup as JPEG: every browser can encode it, and the server turns it into WebP sizes. */
async function encode(image: RGBA): Promise<Blob> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не дал canvas для сохранения макета");
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
}

function finalScale(tpl: TemplateJson): number {
  const long = Math.max(tpl.size[0], tpl.size[1], 1);
  return Math.min(1, FINAL_MAX_EDGE / long);
}

async function handle(request: PreviewRequest): Promise<PreviewResponse> {
  const { id, jsonUrl, backgroundUrl, plan, opts, final, dropIfStalePreview } = request;
  if (dropIfStalePreview) {
    if (id < latestPreviewId) return { id, ok: false, error: "stale", stale: true };
    latestPreviewId = id;
  }
  const assets = await remember(templates, `${jsonUrl}|${backgroundUrl}`, KEEP_TEMPLATES, () => loadTemplate(jsonUrl, backgroundUrl));
  if (dropIfStalePreview && id < latestPreviewId) return { id, ok: false, error: "stale", stale: true };
  const fill = await resolveFill(plan, (url) => remember(images, url, KEEP_IMAGES, () => loadRgba(url)));
  if (dropIfStalePreview && id < latestPreviewId) return { id, ok: false, error: "stale", stale: true };
  const outputScale = final ? finalScale(assets.tpl) : (opts.outputScale ?? 0.4);
  const image = renderUvgrid(assets.tpl, assets.background, assets.layers, fill, { ...opts, outputScale });
  if (final) return { id, ok: true, blob: await encode(image) };
  const buffer = image.data.buffer as ArrayBuffer;
  return { id, ok: true, width: image.width, height: image.height, buffer };
}

scope.onmessage = (event: MessageEvent<PreviewRequest>) => {
  const request = event.data;
  chain = chain.then(async () => {
    try {
      const message = await handle(request);
      if ("buffer" in message && message.ok) {
        scope.postMessage(message, [message.buffer]);
        return;
      }
      scope.postMessage(message);
    } catch (error) {
      const message: PreviewResponse = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
      scope.postMessage(message);
    }
  });
};
