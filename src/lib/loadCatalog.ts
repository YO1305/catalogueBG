import "server-only";
import { hasPinAccess, getSession } from "@/lib/auth";
import { catalogIsExpired } from "@/lib/catalog";
import { getCatalog } from "@/lib/db";
import { buildPublicCatalogModel, getCachedPublicCatalogModel } from "@/lib/loadCatalogCached";

export async function loadCatalog(slug: string) {
  const catalog = await getCatalog(slug);
  if (!catalog || catalog.status === "archived") return { state: "missing" as const };
  const session = await getSession();
  const staff = Boolean(session);
  if (catalog.status === "draft" && !staff) return { state: "missing" as const };
  if (catalogIsExpired(catalog)) return { state: "expired" as const, title: catalog.title };
  if (catalog.access === "pin" && !staff && !(await hasPinAccess(slug))) return { state: "pin" as const, title: catalog.title, slug };
  const useCache = catalog.status === "live" && catalog.access === "public";
  const model = useCache ? await getCachedPublicCatalogModel(slug) : await buildPublicCatalogModel(slug);
  if (!model) return { state: "missing" as const };
  return { state: "ready" as const, model };
}
