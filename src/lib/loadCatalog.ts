import "server-only";
import { hasPinAccess, getSession } from "@/lib/auth";
import { buildPages, catalogIsExpired, resolveFabrics } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import type { Catalog } from "@/types";

export async function loadCatalog(slug: string) {
  const db = await getDb();
  const catalog = db.catalogs.find((item) => item.slug === slug);
  if (!catalog || catalog.status === "archived") return { state: "missing" as const };
  const session = await getSession();
  const staff = Boolean(session);
  if (catalog.status === "draft" && !staff) return { state: "missing" as const };
  if (catalogIsExpired(catalog)) return { state: "expired" as const, title: catalog.title };
  if (catalog.access === "pin" && !staff && !(await hasPinAccess(slug))) return { state: "pin" as const, title: catalog.title, slug };
  const fabrics = resolveFabrics(catalog, db.fabrics);
  const pages = buildPages(catalog, fabrics);
  const safe: Catalog = { ...catalog, pinHash: undefined };
  const coverFabric = db.fabrics.find((fabric) => fabric.id === catalog.cover.fabricId) ?? fabrics[0];
  const coverImage = catalog.cover.imageUrl || coverFabric?.mockups[0]?.url || coverFabric?.design.thumbUrl;
  return {
    state: "ready" as const,
    model: {
      catalog: safe,
      fabrics,
      pages,
      fabricTypes: db.fabricTypes,
      collections: db.collections,
      productTypes: db.productTypes,
      coverImage,
      qr: "",
    },
  };
}
