import "server-only";
import { cache } from "react";
import { hasPinAccess, getSession } from "@/lib/auth";
import { catalogIsExpired } from "@/lib/catalog";
import { FirestoreUnavailableError, getCatalog } from "@/lib/db";
import { buildPublicCatalogModel, getCachedPublicCatalogModel } from "@/lib/loadCatalogCached";
import type { Catalog } from "@/types";

function isCacheablePublicCatalog(catalog: Catalog) {
  return catalog.status === "live" && (catalog.access === "public" || catalog.access === "unlisted");
}

async function loadCatalogUncached(slug: string) {
  try {
    const catalog = await getCatalog(slug);
    if (!catalog || catalog.status === "archived") return { state: "missing" as const };
    if (catalogIsExpired(catalog)) return { state: "expired" as const, title: catalog.title };

    if (isCacheablePublicCatalog(catalog)) {
      const model = await getCachedPublicCatalogModel(slug);
      if (!model) return { state: "missing" as const };
      return { state: "ready" as const, model };
    }

    const session = await getSession();
    const staff = Boolean(session);
    if (catalog.status === "draft" && !staff) return { state: "missing" as const };
    if (catalog.access === "pin" && !staff && !(await hasPinAccess(slug))) {
      return { state: "pin" as const, title: catalog.title, slug };
    }
    const model = await buildPublicCatalogModel(slug);
    if (!model) return { state: "missing" as const };
    return { state: "ready" as const, model };
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return { state: "unavailable" as const };
    throw error;
  }
}

/** Request-local memo so `/c/[slug]` and `/d/[art]` metadata share one load. */
export const loadCatalog = cache(loadCatalogUncached);
