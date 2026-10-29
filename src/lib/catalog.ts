import { isDesignCatalog } from "@/lib/catalogKind";
import { catalogFabricIdOrder, catalogHasManualSections } from "@/lib/catalogSections";
import { fabricKind } from "@/lib/fabricKind";
import { FABRIC_PRODUCT } from "@/lib/mockup/constants";
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
    return catalogFabricIdOrder(catalog).flatMap((id) => {
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

export function fabricMockups(fabric: Fabric): Mockup[] {
  return fabric.mockups.filter((mockup) => mockup.productType === FABRIC_PRODUCT);
}

export function primaryFabricMockup(fabric: Fabric): Mockup | undefined {
  return fabricMockups(fabric).find((mockup) => mockup.isPrimary) ?? fabricMockups(fabric)[0];
}

export function mockupIsSaved(mockup: Mockup | undefined): boolean {
  return Boolean(mockup?.webUrl || mockup?.url);
}

/** Достаточно сохранённого мокапа ткани или изделия — для публикации и каталога. */
export function hasSavedCatalogMockup(fabric: Fabric): boolean {
  const fabricMock = primaryFabricMockup(fabric) ?? fabricMockups(fabric).find((item) => mockupIsSaved(item));
  if (mockupIsSaved(fabricMock)) return true;
  const product = heroMockup(fabric, fabric.productTypes);
  return mockupIsSaved(product);
}

/** Мокап изделия (КПБ, курпача…) — для списка страниц журнала, не мокап «ткани». */
export function catalogProductCoverMockup(fabric: Fabric, showProductTypes: string[]): Mockup | undefined {
  const hero = heroMockup(fabric, showProductTypes);
  if (hero && hero.productType !== FABRIC_PRODUCT && (hero.url || hero.webUrl)) return hero;
  return visibleMockups(fabric, showProductTypes).find(
    (mockup) => mockup.productType !== FABRIC_PRODUCT && (mockup.url || mockup.webUrl),
  );
}

/** Обложка строки в журнале: всегда готовое изделие на мокапе, если сохранено. */
/** Превью в списке страниц каталога. */
export function catalogDesignPreviewSrc(fabric: Fabric, catalog: Catalog, showProductTypes: string[]): string {
  if (isDesignCatalog(catalog) || fabric.designCatalogEntry) {
    return fabric.design.webUrl || fabric.design.thumbUrl || "";
  }
  const mockup = catalogCoverMockup(fabric, showProductTypes);
  return mockup?.url || mockup?.webUrl || fabric.design.webUrl || fabric.design.thumbUrl || "";
}

export function catalogCoverMockup(fabric: Fabric, showProductTypes: string[]): Mockup | undefined {
  const product = catalogProductCoverMockup(fabric, showProductTypes);
  if (product) return product;
  const fabricHero = primaryFabricMockup(fabric);
  if (fabricHero?.url || fabricHero?.webUrl) return fabricHero;
  return heroMockup(fabric, showProductTypes);
}

export type ModalFabricView = { src: string; thumb: string; seamless: boolean };

/** Крупное фото в карточке ткани: мокап ткани или (для печати) рисунок. */
export function modalFabricView(fabric: Fabric, showFlatDesign: boolean, catalog?: Pick<Catalog, "catalogKind">): ModalFabricView | null {
  if (fabric.designCatalogEntry || (catalog && isDesignCatalog(catalog))) {
    if (fabric.design.webUrl) {
      return {
        src: fabric.design.webUrl,
        thumb: fabric.design.thumbUrl || fabric.design.webUrl,
        seamless: fabric.design.seamless,
      };
    }
    return null;
  }
  const kind = fabricKind(fabric);
  const primary = primaryFabricMockup(fabric);
  if (primary?.url || primary?.webUrl) {
    const src = primary.url || primary.webUrl || "";
    return { src, thumb: primary.thumbUrl || primary.webUrl || primary.url || src, seamless: false };
  }
  const anyFabric = fabricMockups(fabric).find((mockup) => mockup.url || mockup.webUrl);
  if (anyFabric) {
    const src = anyFabric.url || anyFabric.webUrl || "";
    return { src, thumb: anyFabric.thumbUrl || anyFabric.webUrl || anyFabric.url || src, seamless: false };
  }
  if (showFlatDesign && kind === "printed" && fabric.design.webUrl) {
    return {
      src: fabric.design.webUrl,
      thumb: fabric.design.thumbUrl || fabric.design.webUrl,
      seamless: fabric.design.seamless,
    };
  }
  return null;
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
    | { kind: "section"; group: "fabricType" | "collection" | "manual"; groupId: string }
    | { kind: "designs"; fabricIds: string[] }
    | { kind: "back" }
  > = [];

  const pushDesigns = (group: Fabric[]) => {
    for (const page of chunk(group, perPage)) {
      content.push({ kind: "designs", fabricIds: page.map((fabric) => fabric.id) });
    }
  };

  if (catalogHasManualSections(catalog)) {
    const byId = new Map(fabrics.map((fabric) => [fabric.id, fabric]));
    for (const section of catalog.catalogSections ?? []) {
      if (!section.fabricIds.length) continue;
      const group = section.fabricIds.flatMap((id) => {
        const fabric = byId.get(id);
        return fabric ? [fabric] : [];
      });
      if (!group.length) continue;
      content.push({ kind: "section", group: "manual", groupId: section.id });
      pushDesigns(group);
    }
  } else if (catalog.layout.sectionBy === "none") {
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

  const pages: BuiltPage[] = [{ kind: "cover", index: 0 }];
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
