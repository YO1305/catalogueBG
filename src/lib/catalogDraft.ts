import type { Catalog } from "@/types";

export function emptyCatalogDraft(): Catalog {
  const now = new Date().toISOString();
  return {
    slug: "",
    title: { ru: "", en: "", uz: "" },
    subtitle: { ru: "", en: "", uz: "" },
    defaultLang: "ru",
    langs: ["ru", "en", "uz"],
    mode: "manual",
    fabricIds: [],
    showProductTypes: [],
    layout: { perPage: 2, sectionBy: "none", theme: "light" },
    cover: {},
    showPrices: false,
    access: "unlisted",
    contacts: { phone: "+998 00 000 00 00", telegram: "bahmal_home", email: "catalog@bahmal.uz", address: "Хорезм, Узбекистан" },
    status: "draft",
    createdBy: "",
    updatedAt: now,
  };
}
