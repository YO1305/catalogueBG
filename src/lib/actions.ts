"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { matchingCatalogs } from "@/lib/catalog";
import {
  deleteCatalog,
  deleteFabric,
  deleteUser,
  getDb,
  saveCatalog,
  saveCollection,
  saveFabric,
  saveFabricType,
  saveGlossary,
  saveLead,
  saveProductType,
  saveTemplate,
  saveUser,
} from "@/lib/db";
import { fallbackTranslate } from "@/lib/glossary";
import { uniqueSlug } from "@/lib/ids";
import { parseDensity, parseWidths } from "@/lib/parseSpecs";
import { hashPassword, hashPin } from "@/lib/password";
import { presetCatalog } from "@/lib/presets";
import { canEditCatalogs, canEditDictionaries, canEditFabrics, canReadLeads, isAdmin } from "@/lib/roles";
import { translateFields, translateFieldsSafe } from "@/lib/translate";
import type { AppUser, Catalog, Collection, Fabric, FabricType, GlossaryTerm, Lead, ProductType, Role, Template } from "@/types";

async function actor(check: (role: Role) => boolean) {
  const session = await getSession();
  if (!session || !check(session.role)) throw new Error("forbidden");
  return session;
}

async function catalogActor() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "auth" as const };
  if (!canEditCatalogs(session.role)) return { ok: false as const, error: "role" as const };
  return { ok: true as const, session };
}

function touch(path: string) {
  revalidatePath(path);
}

export async function saveFabricAction(fabric: Fabric) {
  const session = await actor(canEditFabrics);
  const db = await getDb();
  const art = fabric.art.trim();
  if (art && db.fabrics.some((item) => item.id !== fabric.id && item.art.toLowerCase() === art.toLowerCase())) return { ok: false as const, error: "art_taken" };
  const previous = db.fabrics.find((item) => item.id === fabric.id);
  const next: Fabric = {
    ...fabric,
    art,
    densityRange: parseDensity(fabric.density),
    widthList: parseWidths(fabric.width),
    createdAt: previous?.createdAt ?? fabric.createdAt,
    createdBy: previous?.createdBy ?? session.uid,
    updatedAt: new Date().toISOString(),
  };
  await saveFabric(next);
  touch("/admin/fabrics");
  return { ok: true as const, fabric: next };
}

export async function publishFabricAction(fabric: Fabric) {
  const saved = await saveFabricAction({ ...fabric, status: "published" });
  if (!saved.ok) return saved;
  const db = await getDb();
  const names = matchingCatalogs(saved.fabric, db.catalogs);
  for (const catalog of names) await saveCatalog({ ...catalog, updatedAt: new Date().toISOString() });
  touch("/admin/catalogs");
  return { ok: true as const, catalogs: names.map((catalog) => catalog.title.ru) };
}

export async function setFabricStatusAction(ids: string[], status: Fabric["status"]) {
  const session = await actor((role) => canEditFabrics(role) || (status === "archived" && isAdmin(role)));
  if (status !== "archived" && !canEditFabrics(session.role)) throw new Error("forbidden");
  const db = await getDb();
  const titles: string[] = [];
  for (const id of ids) {
    const fabric = db.fabrics.find((item) => item.id === id);
    if (!fabric) continue;
    const next = { ...fabric, status, updatedAt: new Date().toISOString() };
    await saveFabric(next);
    if (status === "published") titles.push(...matchingCatalogs(next, db.catalogs).map((catalog) => catalog.title.ru));
  }
  touch("/admin/fabrics");
  return { ok: true as const, catalogs: [...new Set(titles)] };
}

export async function deleteFabricAction(id: string) {
  await actor(isAdmin);
  await deleteFabric(id);
  touch("/admin/fabrics");
  return { ok: true as const };
}

export async function addFabricsToCatalogAction(ids: string[], slug: string) {
  await actor(canEditCatalogs);
  const db = await getDb();
  const catalog = db.catalogs.find((item) => item.slug === slug);
  if (!catalog) return { ok: false as const, error: "missing" };
  const fabricIds = [...new Set([...(catalog.fabricIds ?? []), ...ids])];
  await saveCatalog({ ...catalog, mode: "manual", fabricIds, updatedAt: new Date().toISOString() });
  touch(`/admin/catalogs/${slug}`);
  return { ok: true as const };
}

export async function createCatalogAction(catalog: Catalog, pin?: string) {
  const gate = await catalogActor();
  if (!gate.ok) return gate;
  const { session } = gate;
  try {
    const db = await getDb();
    const titleRu = catalog.title.ru.trim();
    if (!titleRu) return { ok: false as const, error: "title" as const };
    const slug = uniqueSlug(titleRu, db.catalogs.map((item) => item.slug));
    const translated = await translateFieldsSafe({ title: titleRu, subtitle: catalog.subtitle.ru }, db.glossary);
    const pinHash = pin ? hashPin(pin) : catalog.pinHash;
    const showProductTypes = catalog.showProductTypes.length
      ? catalog.showProductTypes
      : db.productTypes.filter((item) => item.active).map((item) => item.id);
    const next: Catalog = {
      ...catalog,
      slug,
      title: { ru: titleRu, en: translated.en.title || titleRu, uz: translated.uz.title || titleRu },
      subtitle: {
        ru: catalog.subtitle.ru,
        en: translated.en.subtitle || catalog.subtitle.ru,
        uz: translated.uz.subtitle || catalog.subtitle.ru,
      },
      showProductTypes,
      mode: "manual",
      fabricIds: catalog.fabricIds ?? [],
      expiresAt: undefined,
      cover: {},
      createdBy: session.uid,
      updatedAt: new Date().toISOString(),
      pinHash,
    };
    await saveCatalog(next);
    touch("/admin/catalogs");
    touch(`/c/${slug}`);
    return { ok: true as const, slug };
  } catch (error) {
    console.error("createCatalogAction", error);
    return { ok: false as const, error: "server" as const };
  }
}

export async function deleteCatalogAction(slug: string) {
  await actor(canEditCatalogs);
  await deleteCatalog(slug);
  touch("/admin/catalogs");
  return { ok: true as const };
}

export async function saveCatalogAction(catalog: Catalog, pin?: string) {
  const gate = await catalogActor();
  if (!gate.ok) return gate;
  const { session } = gate;
  try {
    const db = await getDb();
    const previous = db.catalogs.find((item) => item.slug === catalog.slug);
    const pinHash = pin ? hashPin(pin) : catalog.pinHash || previous?.pinHash;
    const titleRu = catalog.title.ru.trim();
    if (!titleRu) return { ok: false as const, error: "title" as const };
    await saveCatalog({
      ...catalog,
      title: { ...catalog.title, ru: titleRu },
      expiresAt: undefined,
      cover: {},
      createdBy: previous?.createdBy ?? session.uid,
      updatedAt: new Date().toISOString(),
      pinHash,
    });
    touch(`/c/${catalog.slug}`);
    touch("/admin/catalogs");
    return { ok: true as const };
  } catch (error) {
    console.error("saveCatalogAction", error);
    return { ok: false as const, error: "server" as const };
  }
}

export async function quickCatalogAction(title: string) {
  const session = await actor(canEditCatalogs);
  const db = await getDb();
  const slug = uniqueSlug(title, db.catalogs.map((item) => item.slug));
  const translated = await translateFields({ title }, db.glossary);
  const now = new Date().toISOString();
  const catalog: Catalog = {
    slug,
    title: { ru: title, en: translated.en.title || title, uz: translated.uz.title || title },
    subtitle: { ru: "", en: "", uz: "" },
    defaultLang: "ru",
    langs: ["ru", "en", "uz"],
    mode: "manual",
    fabricIds: [],
    showProductTypes: db.productTypes.filter((item) => item.active).map((item) => item.id),
    layout: { perPage: 2, sectionBy: "none", theme: "light" },
    cover: {},
    showPrices: false,
    access: "unlisted",
    contacts: { phone: "+998 00 000 00 00", telegram: "bahmal_home", email: "catalog@bahmal.uz", address: "Хорезм, Узбекистан" },
    status: "draft",
    createdBy: session.uid,
    updatedAt: now,
  };
  await saveCatalog(catalog);
  touch("/admin/catalogs");
  return { ok: true as const, slug };
}

export async function presetCatalogAction(preset: string) {
  const session = await actor(canEditCatalogs);
  const db = await getDb();
  const draft = presetCatalog(preset, "tmp", session.uid, db.productTypes);
  const slug = uniqueSlug(draft.title.ru, db.catalogs.map((item) => item.slug));
  await saveCatalog({ ...draft, slug });
  return { ok: true as const, slug };
}

export async function createCollectionAction(input: { nameRu: string; autoCatalog: boolean }) {
  const session = await actor(canEditDictionaries);
  const db = await getDb();
  const id = uniqueSlug(input.nameRu, db.collections.map((item) => item.id));
  const translated = await translateFields({ name: input.nameRu }, db.glossary);
  const item: Collection = {
    id,
    name: { ru: input.nameRu, en: translated.en.name || fallbackTranslate(input.nameRu, "en", db.glossary), uz: translated.uz.name || fallbackTranslate(input.nameRu, "uz", db.glossary) },
    slug: id,
    order: db.collections.length + 1,
    active: true,
  };
  if (input.autoCatalog) {
    const slug = uniqueSlug(input.nameRu, db.catalogs.map((catalog) => catalog.slug));
    item.catalogSlug = slug;
    await saveCatalog({
      slug,
      title: item.name,
      subtitle: { ru: "", en: "", uz: "" },
      defaultLang: "ru",
      langs: ["ru", "en", "uz"],
      mode: "rules",
      rules: { collections: [id] },
      showProductTypes: db.productTypes.filter((product) => product.active).map((product) => product.id),
      layout: { perPage: 2, sectionBy: "none", theme: "light" },
      cover: {},
      showPrices: false,
      access: "public",
      contacts: { phone: "+998 00 000 00 00", telegram: "bahmal_home", email: "catalog@bahmal.uz", address: "Хорезм, Узбекистан" },
      status: "live",
      createdBy: session.uid,
      updatedAt: new Date().toISOString(),
    });
  }
  await saveCollection(item);
  touch("/admin/settings");
  return { ok: true as const, item };
}

export async function saveCollectionAction(item: Collection) {
  await actor(canEditDictionaries);
  await saveCollection(item);
  return { ok: true as const };
}

export async function createFabricTypeAction(input: { nameRu: string; suggestedProductTypes: string[] }) {
  await actor(canEditDictionaries);
  const db = await getDb();
  const id = uniqueSlug(input.nameRu, db.fabricTypes.map((item) => item.id));
  const translated = await translateFields({ name: input.nameRu }, db.glossary);
  const item: FabricType = {
    id,
    name: { ru: input.nameRu, en: translated.en.name || input.nameRu, uz: translated.uz.name || input.nameRu },
    suggestedProductTypes: input.suggestedProductTypes,
    order: db.fabricTypes.length + 1,
    active: true,
  };
  await saveFabricType(item);
  return { ok: true as const, item };
}

export async function saveFabricTypeAction(item: FabricType) {
  await actor(canEditDictionaries);
  await saveFabricType(item);
  return { ok: true as const };
}

export async function createProductTypeAction(input: { nameRu: string; suggestedFor: string[] }) {
  await actor(canEditDictionaries);
  const db = await getDb();
  const id = uniqueSlug(input.nameRu, db.productTypes.map((item) => item.id));
  const translated = await translateFields({ name: input.nameRu }, db.glossary);
  const item: ProductType = {
    id,
    name: { ru: input.nameRu, en: translated.en.name || input.nameRu, uz: translated.uz.name || input.nameRu },
    suggestedFor: input.suggestedFor,
    order: db.productTypes.length + 1,
    active: true,
  };
  await saveProductType(item);
  return { ok: true as const, item };
}

export async function saveProductTypeAction(item: ProductType) {
  await actor(canEditDictionaries);
  await saveProductType(item);
  return { ok: true as const };
}

export async function removeDictionaryAction(kind: "collections" | "fabricTypes" | "productTypes", id: string) {
  await actor(isAdmin);
  const db = await getDb();
  const used =
    kind === "collections"
      ? db.fabrics.some((fabric) => fabric.collectionId === id)
      : kind === "fabricTypes"
        ? db.fabrics.some((fabric) => fabric.fabricTypeId === id)
        : db.fabrics.some((fabric) => fabric.productTypes.includes(id)) || db.templates.some((template) => template.productTypes.includes(id));
  if (used) return { ok: false as const, error: "used" };
  if (kind === "collections") {
    const { deleteCollection } = await import("@/lib/db");
    await deleteCollection(id);
  } else if (kind === "fabricTypes") {
    const { deleteFabricType } = await import("@/lib/db");
    await deleteFabricType(id);
  } else {
    const { deleteProductType } = await import("@/lib/db");
    await deleteProductType(id);
  }
  return { ok: true as const };
}

export async function saveGlossaryAction(terms: GlossaryTerm[]) {
  await actor(isAdmin);
  await saveGlossary(terms);
  return { ok: true as const };
}

export async function saveTemplateAction(template: Template) {
  await actor(isAdmin);
  await saveTemplate(template);
  touch("/admin/templates");
  return { ok: true as const };
}

export async function updateLeadAction(id: string, status: Lead["status"]) {
  await actor(canReadLeads);
  const db = await getDb();
  const lead = db.leads.find((item) => item.id === id);
  if (!lead) return { ok: false as const };
  await saveLead({ ...lead, status });
  return { ok: true as const };
}

export async function createUserAction(input: { email: string; name: string; role: Role; password: string }) {
  await actor(isAdmin);
  const db = await getDb();
  if (db.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) return { ok: false as const, error: "exists" };
  const user: AppUser = { id: crypto.randomUUID(), email: input.email.trim(), name: input.name.trim(), role: input.role, passwordHash: hashPassword(input.password) };
  await saveUser(user);
  return { ok: true as const };
}

export async function deleteUserAction(id: string) {
  const session = await actor(isAdmin);
  if (session.uid === id) return { ok: false as const, error: "self" };
  await deleteUser(id);
  return { ok: true as const };
}

export async function reorderAction(kind: "collections" | "fabricTypes" | "productTypes", ids: string[]) {
  await actor(canEditDictionaries);
  const db = await getDb();
  if (kind === "collections") {
    for (const [index, id] of ids.entries()) {
      const item = db.collections.find((row) => row.id === id);
      if (item) await saveCollection({ ...item, order: index + 1 });
    }
  } else if (kind === "fabricTypes") {
    for (const [index, id] of ids.entries()) {
      const item = db.fabricTypes.find((row) => row.id === id);
      if (item) await saveFabricType({ ...item, order: index + 1 });
    }
  } else {
    for (const [index, id] of ids.entries()) {
      const item = db.productTypes.find((row) => row.id === id);
      if (item) await saveProductType({ ...item, order: index + 1 });
    }
  }
  return { ok: true as const };
}
