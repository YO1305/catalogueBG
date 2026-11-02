import type { BuiltPage, Catalog, CatalogSection } from "@/types";

export function catalogHasManualSections(catalog: Catalog): boolean {
  return Boolean(catalog.catalogSections?.some((section) => section.fabricIds.length > 0));
}

/** Порядок дизайнов: разделы, затем ткани без раздела. */
export function catalogFabricIdOrder(catalog: Catalog): string[] {
  if (catalogHasManualSections(catalog)) {
    const fromSections = (catalog.catalogSections ?? []).flatMap((section) => section.fabricIds);
    const seen = new Set(fromSections);
    const extra = (catalog.fabricIds ?? []).filter((id) => id && !seen.has(id));
    return [...fromSections, ...extra];
  }
  return catalog.fabricIds ?? [];
}

export function catalogSectionById(catalog: Catalog, sectionId: string): CatalogSection | undefined {
  return catalog.catalogSections?.find((section) => section.id === sectionId);
}

export type CatalogSectionLink = { id: string; title: string; pageIndex: number };

export function catalogSectionLinks(catalog: Catalog, pages: BuiltPage[], lang: "ru" | "en" | "uz"): CatalogSectionLink[] {
  if (!catalogHasManualSections(catalog)) return [];
  const links: CatalogSectionLink[] = [];
  for (const page of pages) {
    if (page.kind !== "section" || page.group !== "manual") continue;
    const section = catalogSectionById(catalog, page.groupId);
    if (!section) continue;
    const title = section.title[lang]?.trim() || section.title.ru?.trim() || page.groupId;
    links.push({ id: section.id, title, pageIndex: page.index });
  }
  return links;
}
