import type { Fabric } from "@/types";
import type { Template } from "@/types";
import type { UvgridFabricInput } from "@/lib/uvgrid/types";
import { parseHexColor } from "@/lib/stripeDesign";

export function fabricUsesStripes(fabric: Fabric, template: Template): boolean {
  return fabric.designMode === "stripes" && template.finish === "sateen" && Boolean(fabric.stripes?.length);
}

export function buildStripeFabricInput(fabric: Fabric): Extract<UvgridFabricInput, { mode: "stripes" }> {
  const stripes = (fabric.stripes ?? []).map((band) => ({
    widthCm: band.widthCm,
    color: parseHexColor(band.color),
    shiny: band.shiny,
  }));
  return { mode: "stripes", stripes };
}
