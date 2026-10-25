import type { Fabric, FabricDesign, FabricVariant, Mockup } from "@/types";

export const BASE_VARIANT = "base";

export type ColorOption = { id: string; name: string; design: FabricDesign; mockups: Mockup[] };

/** The main design first, then the extra colourways. */
export function colorOptions(fabric: Fabric): ColorOption[] {
  const extra = (fabric.variants ?? []).filter((variant) => variant.design.webUrl);
  if (!extra.length) return [];
  return [{ id: BASE_VARIANT, name: fabric.colorName ?? "", design: fabric.design, mockups: fabric.mockups }, ...extra];
}

/** The fabric as it looks in the chosen colour: same card, that variant's picture and mockups. */
export function withVariant(fabric: Fabric, variantId?: string): Fabric {
  if (!variantId || variantId === BASE_VARIANT) return fabric;
  const variant = fabric.variants?.find((item) => item.id === variantId);
  if (!variant?.design.webUrl) return fabric;
  return { ...fabric, design: { ...variant.design, seamless: fabric.design.seamless }, mockups: variant.mockups };
}

function latest(mockups: Mockup[]) {
  return mockups.reduce((max, item) => (item.webUrl && item.generatedAt > max ? item.generatedAt : max), "");
}

/** Variant mockups are written by the render route; an older editor copy must not wipe them. */
export function mergeVariants(incoming: FabricVariant[] | undefined, stored: FabricVariant[] | undefined): FabricVariant[] | undefined {
  if (!incoming) return stored;
  return incoming.map((variant) => {
    const saved = stored?.find((item) => item.id === variant.id);
    if (!saved || saved.design.webUrl !== variant.design.webUrl) return variant;
    return latest(saved.mockups) > latest(variant.mockups) ? { ...variant, mockups: saved.mockups } : variant;
  });
}
