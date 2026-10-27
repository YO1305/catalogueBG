import type { Fabric, FabricDesign, FabricVariant, Mockup, Tone } from "@/types";

export const BASE_VARIANT = "base";

export type ColorOption = {
  id: string;
  name: string;
  design: FabricDesign;
  mockups: Mockup[];
  tone?: Tone;
  /** Для тканых вариантов без отдельного фото — цвет переплетения. */
  weaveColor?: string;
};

function variantSelectable(variant: FabricVariant, woven: boolean): boolean {
  if (variant.design.webUrl) return true;
  if (woven && variant.weaveColor) return true;
  if (variant.mockups.some((mockup) => mockup.webUrl || mockup.url)) return true;
  return Boolean(variant.name.trim());
}

export const TONES: Tone[] = ["light", "medium", "dark"];

export function toneVariant(fabric: Fabric, tone: Exclude<Tone, "medium">): FabricVariant | undefined {
  return fabric.variants?.find((item) => item.tone === tone);
}

/** Dyed fabrics need all three tones: medium is the main picture, light and dark are colourways. */
export function missingTones(fabric: Fabric): Tone[] {
  if (!fabric.toned) return [];
  const has = { light: Boolean(toneVariant(fabric, "light")?.design.webUrl), medium: Boolean(fabric.design.webUrl), dark: Boolean(toneVariant(fabric, "dark")?.design.webUrl) };
  return TONES.filter((tone) => !has[tone]);
}

/** The main design first, then the extra colourways; dyed fabrics go light → medium → dark. */
export function colorOptions(fabric: Fabric): ColorOption[] {
  const base: ColorOption = {
    id: BASE_VARIANT,
    name: fabric.colorName ?? "",
    design: fabric.design,
    mockups: fabric.mockups,
    weaveColor: fabric.weave?.color,
  };
  if (fabric.toned) {
    const light = toneVariant(fabric, "light");
    const dark = toneVariant(fabric, "dark");
    const list: ColorOption[] = [
      ...(light?.design.webUrl ? [{ ...light, tone: "light" as const }] : []),
      { ...base, tone: "medium" },
      ...(dark?.design.webUrl ? [{ ...dark, tone: "dark" as const }] : []),
    ];
    return list.length > 1 ? list : [];
  }
  const woven = Boolean(fabric.woven || fabric.kind === "woven");
  const extra = (fabric.variants ?? []).filter((variant) => variantSelectable(variant, woven));
  if (!extra.length) return [];
  const emptyDesign: FabricDesign = { originalUrl: "", webUrl: "", thumbUrl: "", widthPx: 0, heightPx: 0, seamless: false };
  const mapVariant = (variant: FabricVariant): ColorOption => ({
    id: variant.id,
    name: variant.name,
    design: variant.design.webUrl ? variant.design : emptyDesign,
    mockups: variant.mockups,
    weaveColor: variant.weaveColor ?? fabric.weave?.color,
  });
  return [base, ...extra.map(mapVariant)];
}

/** The fabric in one colourway: its picture, its weave colour, its mockups. */
export function variantFabric(fabric: Fabric, variant: FabricVariant): Fabric {
  const weave = fabric.weave && variant.weaveColor ? { ...fabric.weave, color: variant.weaveColor } : fabric.weave;
  return { ...fabric, design: { ...variant.design, seamless: fabric.design.seamless }, weave, mockups: variant.mockups };
}

/** The fabric as it looks in the chosen colour: same card, that variant's picture and mockups. */
export function withVariant(fabric: Fabric, variantId?: string): Fabric {
  if (!variantId || variantId === BASE_VARIANT) return fabric;
  const variant = fabric.variants?.find((item) => item.id === variantId);
  if (!variant) return fabric;
  if (variant.design.webUrl) return variantFabric(fabric, variant);
  const woven = Boolean(fabric.woven || fabric.kind === "woven");
  if (woven && (variant.weaveColor || variant.mockups.some((m) => m.webUrl || m.url))) {
    return variantFabric(fabric, { ...variant, design: fabric.design });
  }
  return fabric;
}

function upsertMockup(list: Mockup[], mockup: Mockup): Mockup[] {
  const same = (item: Mockup) => item.templateId === mockup.templateId && item.productType === mockup.productType;
  return list.some(same) ? list.map((item) => (same(item) ? mockup : item)) : [...list, mockup];
}

/** Put a freshly rendered mockup into the fabric or into one of its colourways. */
export function placeMockup(fabric: Fabric, mockup: Mockup, variantId?: string): Fabric {
  if (!variantId || variantId === BASE_VARIANT) return { ...fabric, mockups: upsertMockup(fabric.mockups, mockup) };
  const variants = (fabric.variants ?? []).map((item) => (item.id === variantId ? { ...item, mockups: upsertMockup(item.mockups, mockup) } : item));
  return { ...fabric, variants };
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
