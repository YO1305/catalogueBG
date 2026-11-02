import { catalogFabricIdOrder, catalogHasManualSections } from "@/lib/catalogSections";
import type { Catalog } from "@/types";

export function catalogIncludesFabric(catalog: Catalog, fabricId: string) {
  if ((catalog.fabricIds ?? []).includes(fabricId)) return true;
  return (catalog.catalogSections ?? []).some((section) => section.fabricIds.includes(fabricId));
}

export type CatalogPick = { slug: string; sectionId: string | null };

export function picksWithFabric(catalogs: Catalog[], fabricId: string): CatalogPick[] {
  return catalogs.flatMap((catalog) => {
    if (!catalogIncludesFabric(catalog, fabricId)) return [];
    const section = (catalog.catalogSections ?? []).find((item) => item.fabricIds.includes(fabricId));
    return [{ slug: catalog.slug, sectionId: section?.id ?? null }];
  });
}

export function catalogPickDiff(before: CatalogPick[], after: CatalogPick[]) {
  const previous = new Map(before.map((pick) => [pick.slug, pick.sectionId]));
  const next = new Set(after.map((pick) => pick.slug));
  return {
    assign: after.filter((pick) => previous.get(pick.slug) !== pick.sectionId),
    remove: before.filter((pick) => !next.has(pick.slug)).map((pick) => pick.slug),
  };
}

export function catalogSlugDiff(before: string[], after: string[]) {
  const previous = new Set(before);
  const next = new Set(after);
  return {
    add: after.filter((slug) => !previous.has(slug)),
    remove: before.filter((slug) => !next.has(slug)),
  };
}

/** Put one fabric in a section, or in the catalogue with no section. */
export function catalogAssignFabric(catalog: Catalog, fabricId: string, sectionId: string | null): Catalog {
  const sections = (catalog.catalogSections ?? []).map((section) => ({
    ...section,
    fabricIds: section.fabricIds.filter((id) => id !== fabricId),
  }));
  if (sectionId) {
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index >= 0) {
      const section = sections[index];
      if (section) sections[index] = { ...section, fabricIds: [...section.fabricIds, fabricId] };
    }
  }
  const catalogSections = catalog.catalogSections ? sections : undefined;
  const fabricIds = [...new Set([...(catalog.fabricIds ?? []).filter((id) => id !== fabricId), fabricId])];
  const next: Catalog = { ...catalog, mode: "manual", catalogSections, fabricIds };
  return { ...next, fabricIds: catalogFabricIdOrder(next) };
}

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
