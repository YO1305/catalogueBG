import type { Catalog, ProductType } from "@/types";

export function presetCatalog(preset: string, slug: string, userId: string, products: ProductType[]): Catalog {
  const now = new Date().toISOString();
  const base: Catalog = {
    slug,
    title: { ru: "", en: "", uz: "" },
    subtitle: { ru: "", en: "", uz: "" },
    coverKicker: { ru: "BAHMAL HOME", en: "BAHMAL HOME", uz: "BAHMAL HOME" },
    defaultLang: "ru",
    langs: ["ru", "en", "uz"],
    mode: "rules",
    rules: {},
    showProductTypes: products.map((item) => item.id),
    layout: { perPage: 2, sectionBy: "none", theme: "light" },
    cover: {},
    showPrices: false,
    access: "public",
    contacts: { phone: "+998 00 000 00 00", telegram: "bahmal_home", email: "catalog@bahmal.uz", address: "Хорезм, Узбекистан" },
    status: "draft",
    createdBy: userId,
    updatedAt: now,
  };
  if (preset === "kurpacha") {
    return { ...base, title: { ru: "Курпача", en: "Kurpacha", uz: "Ko'rpacha" }, rules: { productTypes: ["kurpacha"] }, showProductTypes: ["kurpacha", "pillow"], layout: { ...base.layout, sectionBy: "fabricType" } };
  }
  if (preset === "euro") {
    return { ...base, title: { ru: "Евро коллекция", en: "Euro collection", uz: "Yevro kolleksiya" }, rules: { collections: ["euro"] }, showProductTypes: ["kpb", "duvet", "sheet", "pillowcase"] };
  }
  if (preset === "fashion") {
    return { ...base, title: { ru: "Fashion", en: "Fashion", uz: "Fashion" }, defaultLang: "en", rules: { collections: ["fashion"] }, showProductTypes: ["robe", "roll", "pillow"], layout: { perPage: 1, sectionBy: "none", theme: "dark" } };
  }
  if (preset === "towels") {
    return { ...base, title: { ru: "Полотенца и кухня", en: "Towels and kitchen", uz: "Sochiq va oshxona" }, rules: { productTypes: ["towel", "tea-towel"] }, showProductTypes: ["towel", "tea-towel", "napkins"] };
  }
  return { ...base, title: { ru: "Новинки сезона", en: "New this season", uz: "Mavsum yangiliklari" }, rules: { onlyNew: true }, layout: { ...base.layout, sectionBy: "collection" } };
}
