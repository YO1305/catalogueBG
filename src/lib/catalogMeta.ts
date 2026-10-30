import "server-only";
import { unstable_cache } from "next/cache";
import { resolveFabrics } from "@/lib/catalog";
import { catalogFabricIdOrder } from "@/lib/catalogSections";
import { FirestoreUnavailableError, getCatalog, getFabrics, getFabricsByIds } from "@/lib/db";
import type { Catalog } from "@/types";

export const CATALOG_REVALIDATE_SEC = 600;

export function catalogCacheTag(slug: string) {
  return `catalog:${slug}`;
}

async function fabricCountForCatalog(catalog: Catalog) {
  if (catalog.mode === "manual") {
    const ids = catalogFabricIdOrder(catalog);
    const fabrics = await getFabricsByIds(ids);
    return resolveFabrics(catalog, fabrics).length;
  }
  const fabrics = await getFabrics();
  return resolveFabrics(catalog, fabrics).length;
}

export async function getCatalogPublicMeta(slug: string) {
  try {
    return await unstable_cache(
      async () => {
        const catalog = await getCatalog(slug);
        if (!catalog || catalog.status === "archived") return null;
        const count = await fabricCountForCatalog(catalog);
        return { catalog, count };
      },
      [`catalog-meta-${slug}`],
      { revalidate: CATALOG_REVALIDATE_SEC, tags: [catalogCacheTag(slug)] },
    )();
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return null;
    throw error;
  }
}
