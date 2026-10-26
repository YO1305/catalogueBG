import type { Fabric, FabricType, FabricWeave, Template } from "@/types";

export const WOVEN_TYPE_IDS = ["stripe-sateen", "jacquard", "damask"];
const WOVEN_NAME = /страйп|жаккард|дамаск|stripe|jacquard|damask|jakkard|damask/i;

export const STRIPE_PRESETS: Array<Array<{ widthCm: number; shiny: boolean }>> = [
  [{ widthCm: 0.5, shiny: true }, { widthCm: 0.5, shiny: false }],
  [{ widthCm: 1, shiny: true }, { widthCm: 1, shiny: false }],
  [{ widthCm: 1.25, shiny: true }, { widthCm: 1.25, shiny: false }],
  [{ widthCm: 2, shiny: true }, { widthCm: 2, shiny: false }],
  [{ widthCm: 3, shiny: true }, { widthCm: 1, shiny: false }],
];

export const CORRECTION_MIN = 0.8;
export const CORRECTION_MAX = 1.4;
export const DEFAULT_CORRECTION = 1.15;

/** Flag set in the directory wins; older records without it fall back to id / name. */
export function isWovenType(type: FabricType | undefined): boolean {
  if (!type) return false;
  if (typeof type.woven === "boolean") return type.woven;
  return WOVEN_TYPE_IDS.includes(type.id) || WOVEN_NAME.test(`${type.name.ru} ${type.name.en}`);
}

export function defaultWeave(color = "#e8e2d6"): FabricWeave {
  return { color, correction: DEFAULT_CORRECTION, pattern: "stripes", stripes: STRIPE_PRESETS[1] };
}

export function templateFitsFabric(
  fabric: Pick<Fabric, "woven">,
  template: Pick<Template, "finish" | "weaveCapable" | "texture">,
): boolean {
  if (template.texture === "stripe-sateen" && !fabric.woven) return false;
  return true;
}

/** Подсказка, если matte-шаблон без weave-слоёв — тканый цвет всё равно ляжет, но без полос/жаккарда. */
export function wovenTemplateHint(
  fabric: Pick<Fabric, "woven">,
  template: Pick<Template, "finish" | "weaveCapable">,
): boolean {
  return Boolean(fabric.woven && template.finish !== "sateen" && !template.weaveCapable);
}

export function presetLabel(stripes: Array<{ widthCm: number }>): string {
  return stripes.map((item) => String(item.widthCm)).join("+");
}

/** "#rrggbb" multiplied by factor, used when the lighter/darker slider moves. */
export function scaleHex(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  const part = (index: number) => {
    const value = Math.round(parseInt(clean.slice(index, index + 2), 16) * factor);
    return Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0)).toString(16).padStart(2, "0");
  };
  return `#${part(0)}${part(2)}${part(4)}`;
}
