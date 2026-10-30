"use client";

import { useMemo } from "react";
import { CatalogAdminPreview } from "@/components/admin/CatalogAdminPreview";
import { buildPages, resolveFabrics } from "@/lib/catalog";
import { localizeCatalogModel } from "@/lib/localize";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Catalog, Collection, Fabric, FabricType, Lang, ProductType } from "@/types";

export function CatalogEditorPreview({
  catalog,
  fabrics,
  collections,
  fabricTypes,
  productTypes,
  editLang,
}: {
  catalog: Catalog;
  fabrics: Fabric[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  editLang: Lang;
}) {
  const previewCatalog = useDebouncedValue(catalog, 300);
  const resolved = useMemo(() => resolveFabrics(previewCatalog, fabrics), [previewCatalog, fabrics]);
  const pages = useMemo(() => buildPages(previewCatalog, resolved), [previewCatalog, resolved]);
  const previewModel = useMemo(
    () =>
      localizeCatalogModel({
        catalog: { ...previewCatalog, defaultLang: editLang },
        fabrics: resolved,
        pages,
        fabricTypes,
        collections,
        productTypes,
        coverImage: previewCatalog.cover.imageUrl,
        qr: "",
      }),
    [previewCatalog, editLang, resolved, pages, fabricTypes, collections, productTypes],
  );
  return (
    <div className="min-h-[70vh] overflow-hidden border bg-sand">
      <CatalogAdminPreview key={editLang} model={previewModel} />
    </div>
  );
}
