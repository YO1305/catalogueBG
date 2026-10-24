import type { Catalog } from "@/types";

export type CatalogThemeId = Catalog["layout"]["theme"];

export const CATALOG_THEMES: Array<{ id: CatalogThemeId; labelKey: string; cover: string; page: string }> = [
  {
    id: "classic",
    labelKey: "catalogs.themeClassic",
    cover: "linear-gradient(165deg, #163a66 0%, #0e2746 58%, #1c1915 100%)",
    page: "#e6dfd2",
  },
  {
    id: "light",
    labelKey: "catalogs.themeLight",
    cover: "linear-gradient(160deg, #f6f3ee 0%, #d9d0c0 100%)",
    page: "#f6f3ee",
  },
  {
    id: "dark",
    labelKey: "catalogs.themeDark",
    cover: "linear-gradient(165deg, #1c1915 0%, #100e0c 100%)",
    page: "#221f1b",
  },
  {
    id: "sand",
    labelKey: "catalogs.themeSand",
    cover: "linear-gradient(165deg, #8b6914 0%, #c4a574 45%, #f0e6d2 100%)",
    page: "#ebe3d4",
  },
];

export function coverStyle(theme: CatalogThemeId) {
  return CATALOG_THEMES.find((item) => item.id === theme)?.cover ?? CATALOG_THEMES[0].cover;
}
