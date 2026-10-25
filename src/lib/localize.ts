import type { Catalog, Collection, Fabric, FabricType, Localized, ProductType } from "@/types";

/** An empty EN/UZ field shows the Russian text instead of nothing. */
export function withFallback(value: Localized): Localized {
  const ru = value.ru ?? "";
  return { ru, en: value.en?.trim() ? value.en : ru, uz: value.uz?.trim() ? value.uz : ru };
}

function named<T extends { name: Localized }>(items: T[]): T[] {
  return items.map((item) => ({ ...item, name: withFallback(item.name) }));
}

export function localizeCatalogModel<
  M extends { catalog: Catalog; fabrics: Fabric[]; fabricTypes: FabricType[]; collections: Collection[]; productTypes: ProductType[] },
>(model: M): M {
  return {
    ...model,
    catalog: { ...model.catalog, title: withFallback(model.catalog.title), subtitle: withFallback(model.catalog.subtitle) },
    fabrics: model.fabrics.map((fabric) => ({
      ...fabric,
      name: withFallback(fabric.name),
      description: withFallback(fabric.description),
      composition: withFallback(fabric.composition),
      ...(fabric.finish ? { finish: withFallback(fabric.finish) } : {}),
      ...(fabric.finishExtra ? { finishExtra: withFallback(fabric.finishExtra) } : {}),
    })),
    fabricTypes: named(model.fabricTypes),
    collections: named(model.collections),
    productTypes: named(model.productTypes),
  };
}
