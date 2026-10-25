/// <reference lib="webworker" />
import { resolveFill, type FillPlan } from "@/lib/mockup/fill";
import { loadRgba, loadRgbaSized } from "@/lib/mockup/loadRgba";
import { renderUvgrid, type RenderOptions, type RGBA, type TemplateJson, type ZoneLayers } from "@/lib/mockup/uvgridRender";

export type PreviewRequest = { id: number; jsonUrl: string; backgroundUrl: string; plan: FillPlan; opts: RenderOptions };
export type PreviewResponse =
  | { id: number; ok: true; width: number; height: number; buffer: ArrayBuffer }
  | { id: number; ok: false; error: string };

type Assets = { tpl: TemplateJson; background: RGBA; layers: Record<string, ZoneLayers> };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const templates = new Map<string, Promise<Assets>>();
const images = new Map<string, Promise<RGBA>>();
const KEEP_TEMPLATES = 2;
const KEEP_IMAGES = 6;

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
        const [mask, shade, weave, gloss] = await Promise.all([
          loadRgba(zone.mask),
          loadRgba(zone.shade),
          zone.weave ? loadRgba(zone.weave) : undefined,
          zone.gloss ? loadRgba(zone.gloss) : undefined,
        ]);
        return [zone.id, { mask, shade, weave, gloss }] as const;
      }),
    ),
  ]);
  return { tpl, background, layers: Object.fromEntries(zones) };
}

scope.onmessage = async (event: MessageEvent<PreviewRequest>) => {
  const { id, jsonUrl, backgroundUrl, plan, opts } = event.data;
  try {
    const assets = await remember(templates, `${jsonUrl}|${backgroundUrl}`, KEEP_TEMPLATES, () => loadTemplate(jsonUrl, backgroundUrl));
    const fill = await resolveFill(plan, (url) => remember(images, url, KEEP_IMAGES, () => loadRgba(url)));
    const image = renderUvgrid(assets.tpl, assets.background, assets.layers, fill, opts);
    const buffer = image.data.buffer as ArrayBuffer;
    const message: PreviewResponse = { id, ok: true, width: image.width, height: image.height, buffer };
    scope.postMessage(message, [buffer]);
  } catch (error) {
    const message: PreviewResponse = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
    scope.postMessage(message);
  }
};
