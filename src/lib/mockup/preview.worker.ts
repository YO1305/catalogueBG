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
  | { id: number; ok: true; web: Blob; thumb: Blob }
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

async function encodeWebp(image: RGBA, maxEdge: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height, 1));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const source = new OffscreenCanvas(image.width, image.height);
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) throw new Error("Браузер не дал canvas для сохранения макета");
  sourceCtx.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  if (width === image.width && height === image.height) {
    return source.convertToBlob({ type: "image/webp", quality: 0.9 });
  }
  const out = new OffscreenCanvas(width, height);
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Браузер не дал canvas для сохранения макета");
  outCtx.drawImage(source, 0, 0, width, height);
  return out.convertToBlob({ type: "image/webp", quality: 0.9 });
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
  if (final) {
    const [web, thumb] = await Promise.all([encodeWebp(image, 1200), encodeWebp(image, 600)]);
    return { id, ok: true, web, thumb };
  }
  const buffer = image.data.buffer as ArrayBuffer;
  return { id, ok: true, width: image.width, height: image.height, buffer };
}

scope.onmessage = (event: MessageEvent<PreviewRequest>) => {
  const request = event.data;
  if (request.final) latestPreviewId = Math.max(latestPreviewId, request.id);
  chain = chain.then(async () => {
    try {
      if (!request.final && request.id < latestPreviewId) {
        scope.postMessage({ id: request.id, ok: false, error: "stale", stale: true } satisfies PreviewResponse);
        return;
      }
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
