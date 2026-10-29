import type { Catalog } from "@/types";

export type CatalogKind = "standard" | "design";

export function isCatalogKind(value: unknown): value is CatalogKind {
  return value === "standard" || value === "design";
}

export function catalogKindOf(catalog: Pick<Catalog, "catalogKind">): CatalogKind {
  return catalog.catalogKind === "design" ? "design" : "standard";
}

export function isDesignCatalog(catalog: Pick<Catalog, "catalogKind">): boolean {
  return catalogKindOf(catalog) === "design";
}
