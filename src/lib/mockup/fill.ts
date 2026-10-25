import type { Fill, RenderOptions, RGBA, Stripe } from "@/lib/mockup/uvgridRender";
import type { Fabric, FabricDesign, Mockup } from "@/types";

/** What to put on the template, with pictures still as URLs (they are loaded differently in Node and in the browser). */
export type FillPlan =
  | { kind: "design"; url: string; rapport: Fabric["rapport"] }
  | { kind: "stripes"; stripes: Stripe[] }
  | { kind: "weave"; color: string; stripes?: Array<{ widthCm: number; shiny: boolean }>; mapUrl?: string; mapWidthCm?: number };

export function fillPlan(fabric: Fabric, design: FabricDesign = fabric.design): FillPlan | null {
  if (fabric.woven) {
    const weave = fabric.weave;
    if (!weave?.color) return null;
    if (weave.pattern === "stripes" && weave.stripes?.length) return { kind: "weave", color: weave.color, stripes: weave.stripes };
    if (weave.pattern === "map" && weave.mapUrl) return { kind: "weave", color: weave.color, mapUrl: weave.mapUrl, mapWidthCm: weave.mapWidthCm || 10 };
    return { kind: "weave", color: weave.color };
  }
  if (fabric.designMode === "stripes" && fabric.stripes?.length) return { kind: "stripes", stripes: fabric.stripes };
  const url = design.webUrl || design.originalUrl;
  return url ? { kind: "design", url, rapport: fabric.rapport } : null;
}

/** Width of the picture in cm: the long side of the rapport goes along the longer side of the image. */
export function tileCm(rapport: Fabric["rapport"], widthPx: number, heightPx: number) {
  const short = rapport.widthCm || rapport.heightCm || 8;
  const long = rapport.heightCm || rapport.widthCm || 8;
  const longCm = Math.max(short, long);
  const shortCm = Math.min(short, long);
  return widthPx >= heightPx ? { tileWidthCm: longCm, tileHeightCm: shortCm } : { tileWidthCm: shortCm, tileHeightCm: longCm };
}

export async function resolveFill(plan: FillPlan, load: (url: string) => Promise<RGBA>): Promise<Fill> {
  if (plan.kind === "stripes") return plan;
  if (plan.kind === "design") {
    const tile = await load(plan.url);
    return { kind: "design", tile, ...tileCm(plan.rapport, tile.width, tile.height) };
  }
  if (plan.mapUrl) return { kind: "weave", color: plan.color, map: await load(plan.mapUrl), mapWidthCm: plan.mapWidthCm };
  return { kind: "weave", color: plan.color, stripes: plan.stripes };
}

export function fillPlanKey(plan: FillPlan | null): string {
  return JSON.stringify(plan);
}

export function mockupOptions(mockup: Mockup): RenderOptions {
  const fit = (area: Mockup["areas"][number] | undefined) => ({
    scale: area?.scale || 1,
    rot: area?.rotation ?? 0,
    du: area?.offsetX ?? 0,
    dv: area?.offsetY ?? 0,
  });
  if (mockup.sameForAllAreas) return fit(mockup.areas[0]);
  return { perZone: Object.fromEntries(mockup.areas.map((area) => [area.areaId, fit(area)])) };
}
