import type { Fabric } from "@/types";

const COLOR_ALIASES: Record<string, string[]> = {
  blue: ["синий"],
  gold: ["золото"],
  red: ["бордовый"],
  green: ["зелёный", "мята"],
  beige: ["песок", "беж"],
  black: ["чёрный"],
  "ko'k": ["синий"],
  oltin: ["золото"],
  yashil: ["мята", "зелёный"],
};

/** Search by name, article, tags, colours and colourway names. */
export function searchFabrics(fabrics: Fabric[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const aliases = COLOR_ALIASES[needle] ?? [];
  return fabrics.filter((fabric) => {
    const variantNames = [fabric.colorName ?? "", ...(fabric.variants ?? []).map((variant) => variant.name)];
    const hay = [fabric.art, fabric.name.ru, fabric.name.en, fabric.name.uz, ...fabric.tags, ...fabric.colors, ...variantNames].join(" ").toLowerCase();
    return hay.includes(needle) || aliases.some((alias) => hay.includes(alias));
  });
}
