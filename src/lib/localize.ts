import type { Catalog, Collection, Fabric, FabricType, Lang, Localized, ProductType } from "@/types";

export function contactAddress(catalog: Catalog, lang: Lang) {
  const own = catalog.contacts.addressI18n?.[lang]?.trim();
  return own || catalog.contacts.addressI18n?.ru?.trim() || catalog.contacts.address;
}

type Contacts = Catalog["contacts"];

/** What the editor shows for one language: EN/UZ stay empty until typed. */
export function addressField(contacts: Contacts, lang: Lang) {
  if (lang === "ru") return contacts.addressI18n?.ru ?? contacts.address;
  return contacts.addressI18n?.[lang] ?? "";
}

export function setAddress(contacts: Contacts, lang: Lang, value: string): Contacts {
  const current = { ru: contacts.address, en: "", uz: "", ...contacts.addressI18n };
  const addressI18n = { ...current, [lang]: value };
  return { ...contacts, address: addressI18n.ru, addressI18n };
}

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
