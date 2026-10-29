import "server-only";
import { unstable_cache } from "next/cache";
import { resolveFabrics } from "@/lib/catalog";
import { catalogFabricIdOrder } from "@/lib/catalogSections";
import { getCatalog, getFabrics, getFabricsByIds } from "@/lib/db";
import type { Catalog } from "@/types";

export const CATALOG_REVALIDATE_SEC = 600;

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
  return unstable_cache(
    async () => {
      const catalog = await getCatalog(slug);
      if (!catalog || catalog.status === "archived") return null;
      const count = await fabricCountForCatalog(catalog);
      return { catalog, count };
    },
    [`catalog-meta-${slug}`],
    { revalidate: CATALOG_REVALIDATE_SEC, tags: [`catalog-${slug}`] },
  )();
}
