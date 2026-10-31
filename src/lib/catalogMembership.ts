import { catalogFabricIdOrder, catalogHasManualSections } from "@/lib/catalogSections";
import type { Catalog } from "@/types";

export function catalogIncludesFabric(catalog: Catalog, fabricId: string) {
  if ((catalog.fabricIds ?? []).includes(fabricId)) return true;
  return (catalog.catalogSections ?? []).some((section) => section.fabricIds.includes(fabricId));
}

export function slugsWithFabric(catalogs: Catalog[], fabricId: string) {
  return catalogs.filter((catalog) => catalogIncludesFabric(catalog, fabricId)).map((catalog) => catalog.slug);
}

export function catalogSlugDiff(before: string[], after: string[]) {
  const previous = new Set(before);
  const next = new Set(after);
  return {
    add: after.filter((slug) => !previous.has(slug)),
    remove: before.filter((slug) => !next.has(slug)),
  };
}

/** Append ids and switch the catalogue to the manual list. */
export function catalogWithFabrics(catalog: Catalog, ids: string[]): Catalog {
  return {
    ...catalog,
    mode: "manual",
    fabricIds: [...new Set([...(catalog.fabricIds ?? []), ...ids])],
  };
}

/** Drop one fabric from the manual list and from every section. */
export function catalogWithoutFabric(catalog: Catalog, fabricId: string): Catalog {
  const catalogSections = catalog.catalogSections?.map((section) => ({
    ...section,
    fabricIds: section.fabricIds.filter((id) => id !== fabricId),
  }));
  const stripped: Catalog = {
    ...catalog,
    catalogSections,
    fabricIds: (catalog.fabricIds ?? []).filter((id) => id !== fabricId),
  };
  const fabricIds = catalogHasManualSections(stripped) ? catalogFabricIdOrder(stripped) : (stripped.fabricIds ?? []);
  return { ...stripped, fabricIds };
}
