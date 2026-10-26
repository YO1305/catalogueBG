import "server-only";
import { hasPinAccess, getSession } from "@/lib/auth";
import { buildPages, catalogCoverMockup, catalogIsExpired, resolveFabrics } from "@/lib/catalog";
import { sanitizePublicFabric } from "@/lib/publicFabric";
import { getCatalog, getDictionaries, getFabrics } from "@/lib/db";
import { localizeCatalogModel } from "@/lib/localize";
import type { Catalog } from "@/types";

export async function loadCatalog(slug: string) {
  const catalog = await getCatalog(slug);
  if (!catalog || catalog.status === "archived") return { state: "missing" as const };
  const session = await getSession();
  const staff = Boolean(session);
  if (catalog.status === "draft" && !staff) return { state: "missing" as const };
  if (catalogIsExpired(catalog)) return { state: "expired" as const, title: catalog.title };
  if (catalog.access === "pin" && !staff && !(await hasPinAccess(slug))) return { state: "pin" as const, title: catalog.title, slug };
  const [allFabrics, dictionaries] = await Promise.all([getFabrics(), getDictionaries()]);
  const resolved = resolveFabrics(catalog, allFabrics);
  const fabrics = resolved.map((fabric) => sanitizePublicFabric(fabric, catalog));
  const pages = buildPages(catalog, fabrics);
  const safe: Catalog = { ...catalog, pinHash: undefined };
  const coverFabric = fabrics.find((fabric) => fabric.id === catalog.cover.fabricId) ?? fabrics[0];
  const coverMockup = coverFabric ? catalogCoverMockup(coverFabric, catalog.showProductTypes) : undefined;
  const coverImage = catalog.cover.imageUrl || coverMockup?.url || coverMockup?.webUrl;
  return {
    state: "ready" as const,
    model: localizeCatalogModel({
      catalog: safe,
      fabrics,
      pages,
      fabricTypes: dictionaries.fabricTypes,
      collections: dictionaries.collections,
      productTypes: dictionaries.productTypes,
      coverImage,
      qr: "",
    }),
  };
}
