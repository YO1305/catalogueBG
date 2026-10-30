import "server-only";
import { unstable_cache } from "next/cache";
import { buildPages, catalogCoverMockup, resolveFabrics } from "@/lib/catalog";
import { catalogFabricIdOrder } from "@/lib/catalogSections";
import { CATALOG_REVALIDATE_SEC, catalogCacheTag } from "@/lib/catalogMeta";
import { getCatalog, getDictionaries, getFabrics, getFabricsByIds } from "@/lib/db";
import { localizeCatalogModel } from "@/lib/localize";
import { sanitizePublicFabric } from "@/lib/publicFabric";
import type { Catalog } from "@/types";

async function fabricsForCatalog(catalog: Catalog) {
  if (catalog.mode === "manual") {
    return getFabricsByIds(catalogFabricIdOrder(catalog));
  }
  return getFabrics();
}

export async function buildPublicCatalogModel(slug: string) {
  const catalog = await getCatalog(slug);
  if (!catalog || catalog.status === "archived") return null;
  const [allFabrics, dictionaries] = await Promise.all([fabricsForCatalog(catalog), getDictionaries()]);
  const resolved = resolveFabrics(catalog, allFabrics);
  const fabrics = resolved.map((fabric) => sanitizePublicFabric(fabric, catalog));
  const pages = buildPages(catalog, fabrics);
  const safe: Catalog = { ...catalog, pinHash: undefined };
  const coverFabric = fabrics.find((fabric) => fabric.id === catalog.cover.fabricId) ?? fabrics[0];
  const coverMockup = coverFabric ? catalogCoverMockup(coverFabric, catalog.showProductTypes) : undefined;
  const coverImage = catalog.cover.imageUrl?.trim()
    ? catalog.cover.imageUrl
    : coverMockup?.url || coverMockup?.webUrl;
  return localizeCatalogModel({
    catalog: safe,
    fabrics,
    pages,
    fabricTypes: dictionaries.fabricTypes,
    collections: dictionaries.collections,
    productTypes: dictionaries.productTypes,
    coverImage,
    qr: "",
  });
}

export function getCachedPublicCatalogModel(slug: string) {
  return unstable_cache(() => buildPublicCatalogModel(slug), [`catalog-model-${slug}`], {
    revalidate: CATALOG_REVALIDATE_SEC,
    tags: [catalogCacheTag(slug)],
  })();
}
