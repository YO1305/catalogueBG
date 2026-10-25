import type { BuiltPage, Catalog, CatalogRules, Fabric, Mockup } from "@/types";

export function fabricMatchesRules(fabric: Fabric, rules: CatalogRules) {
  if (fabric.status !== "published") return false;
  if (rules.collections?.length && !rules.collections.includes(fabric.collectionId)) return false;
  if (rules.fabricTypes?.length && !rules.fabricTypes.includes(fabric.fabricTypeId)) return false;
  if (rules.productTypes?.length && !rules.productTypes.some((id) => fabric.productTypes.includes(id))) return false;
  if (rules.tags?.length && !rules.tags.some((tag) => fabric.tags.map((item) => item.toLowerCase()).includes(tag.toLowerCase()))) return false;
  if (rules.onlyNew && !fabric.isNew) return false;
  if (rules.publishedAfter && fabric.createdAt < rules.publishedAfter) return false;
  return true;
}

export function resolveFabrics(catalog: Catalog, fabrics: Fabric[]) {
  const published = fabrics.filter((fabric) => fabric.status === "published");
  if (catalog.mode === "manual") {
    const byId = new Map(published.map((fabric) => [fabric.id, fabric]));
    return (catalog.fabricIds ?? []).flatMap((id) => {
      const fabric = byId.get(id);
      return fabric ? [fabric] : [];
    });
  }
  return published
    .filter((fabric) => fabricMatchesRules(fabric, catalog.rules ?? {}))
    .sort((a, b) => a.art.localeCompare(b.art));
}

export function matchingCatalogs(fabric: Fabric, catalogs: Catalog[]) {
  return catalogs.filter(
    (catalog) => catalog.status !== "archived" && catalog.mode === "rules" && fabricMatchesRules(fabric, catalog.rules ?? {}),
  );
}

export function visibleMockups(fabric: Fabric, showProductTypes: string[]): Mockup[] {
  return fabric.mockups.filter((mockup) => showProductTypes.includes(mockup.productType));
}

export function heroMockup(fabric: Fabric, showProductTypes: string[]) {
  for (const productType of showProductTypes) {
    const found = fabric.mockups.find((mockup) => mockup.productType === productType);
    if (found) return found;
  }
  return undefined;
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** Rows on a design page: at least three, so a sheet never shows one stretched design. */
export function designsPerPage(catalog: Catalog) {
  return Math.max(3, catalog.layout.perPage);
}

export function buildPages(catalog: Catalog, fabrics: Fabric[]): BuiltPage[] {
  const perPage = designsPerPage(catalog);
  const content: Array<
    | { kind: "section"; group: "fabricType" | "collection"; groupId: string }
    | { kind: "designs"; fabricIds: string[] }
    | { kind: "back" }
  > = [];

  const pushDesigns = (group: Fabric[]) => {
    for (const page of chunk(group, perPage)) {
      content.push({ kind: "designs", fabricIds: page.map((fabric) => fabric.id) });
    }
  };

  if (catalog.layout.sectionBy === "none") {
    pushDesigns(fabrics);
  } else {
    const key = catalog.layout.sectionBy === "fabricType" ? "fabricTypeId" : "collectionId";
    const seen: string[] = [];
    for (const fabric of fabrics) {
      const id = fabric[key];
      if (!seen.includes(id)) seen.push(id);
    }
    for (const groupId of seen) {
      content.push({
        kind: "section",
        group: catalog.layout.sectionBy,
        groupId,
      });
      pushDesigns(fabrics.filter((fabric) => fabric[key] === groupId));
    }
  }
  content.push({ kind: "back" });

  const entries = content.map((page, contentIndex) => {
    if (page.kind === "section") return { label: "section" as const, id: page.groupId, contentIndex };
    if (page.kind === "designs") return { label: "design" as const, id: page.fabricIds[0] ?? "", contentIndex };
    return { label: "back" as const, id: "back", contentIndex };
  });

  const tocSlots = Math.max(1, Math.ceil(entries.length / 14));
  const pages: BuiltPage[] = [{ kind: "cover", index: 0 }];
  for (let slot = 0; slot < tocSlots; slot += 1) {
    const slice = entries.slice(slot * 14, slot * 14 + 14).map((entry) => ({
      target: 1 + tocSlots + entry.contentIndex + 1,
      label: entry.label,
      id: entry.id,
    }));
    pages.push({ kind: "toc", index: pages.length, entries: slice });
  }
  content.forEach((page) => {
    const index = pages.length;
    if (page.kind === "section") pages.push({ kind: "section", index, group: page.group, groupId: page.groupId });
    else if (page.kind === "designs") pages.push({ kind: "designs", index, fabricIds: page.fabricIds });
    else pages.push({ kind: "back", index });
  });
  return pages;
}

export function catalogIsExpired(catalog: Catalog, now = Date.now()) {
  if (!catalog.expiresAt) return false;
  return new Date(catalog.expiresAt).getTime() < now;
}
