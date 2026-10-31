"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { catalogCacheTag } from "@/lib/catalogMeta";
import { getSession } from "@/lib/auth";
import { matchingCatalogs } from "@/lib/catalog";
import {
  deleteCatalog,
  deleteFabric,
  deleteFinish,
  deleteUser,
  getCatalog,
  getCatalogs,
  getDictionaries,
  getFabric,
  getUsers,
  isDictionaryItemUsed,
  listFabricPickerPage,
  uniqueCatalogSlug,
  saveCatalog,
  saveCollection,
  saveFabric,
  saveFabricType,
  saveFinish,
  saveGlossary,
  saveLead,
  saveProductType,
  deleteTemplate,
  saveTemplate,
  saveUser,
} from "@/lib/db";
import { emptyFabric } from "@/lib/fabricDraft";
import { persistFabric } from "@/lib/fabricSave";
import { catalogWithFabrics, catalogWithoutFabric } from "@/lib/catalogMembership";
import { catalogFabricIdOrder, catalogHasManualSections } from "@/lib/catalogSections";
import { fallbackTranslate } from "@/lib/glossary";
import { uniqueSlug } from "@/lib/ids";
import { hashPassword, hashPin } from "@/lib/password";
import { presetCatalog } from "@/lib/presets";
import { canEditCatalogs, canEditDictionaries, canEditFabrics, canReadLeads, isAdmin } from "@/lib/roles";
import { actionErrorFromUnknown, catchQuota } from "@/lib/firestoreGuard";
import { translateFields } from "@/lib/translate";
import type { AdminSection, AppUser, Catalog, Collection, Fabric, FabricType, Finish, GlossaryTerm, Lead, ProductType, Role, Template } from "@/types";

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
  const catalogMatch = /^\/c\/([^/]+)/.exec(path);
  if (catalogMatch) revalidateTag(catalogCacheTag(catalogMatch[1]));
}

export async function listFabricPickerPageAction(query: string, cursor: string | null) {
  try {
    const gate = await catalogActor();
    if (!gate.ok) return { items: [], cursor: null };
    return listFabricPickerPage({ query, cursor });
  } catch (error) {
    const code = actionErrorFromUnknown(error);
    if (code === "quota" || code === "timeout") return { items: [], cursor: null, error: code };
    throw error;
  }
}

export async function getFabricForCatalogAction(id: string) {
  try {
    const gate = await catalogActor();
    if (!gate.ok) return null;
    return getFabric(id);
  } catch (error) {
    const code = actionErrorFromUnknown(error);
    if (code === "quota" || code === "timeout") return { error: code };
    throw error;
  }
}

export async function saveFabricAction(fabric: Fabric) {
  return catchQuota(async () => {
    const session = await actor(canEditFabrics);
    const saved = await persistFabric(session, fabric);
    if (saved.ok) touch("/admin/fabrics");
    return saved;
  });
}

export async function publishFabricAction(fabric: Fabric) {
  return catchQuota(async () => {
    const session = await actor(canEditFabrics);
    const saved = await persistFabric(session, { ...fabric, status: "published" });
    if (!saved.ok) return saved;
    const names = matchingCatalogs(saved.fabric, await getCatalogs());
    touch("/admin/fabrics");
    touch("/admin/catalogs");
    for (const catalog of names) touch(`/c/${catalog.slug}`);
    return { ok: true as const, catalogs: names.map((catalog) => catalog.title.ru), updatedAt: saved.fabric.updatedAt };
  });
}

export async function setFabricStatusAction(ids: string[], status: Fabric["status"]) {
  return catchQuota(async () => {
  const session = await actor((role) => canEditFabrics(role) || (status === "archived" && isAdmin(role)));
  if (status !== "archived" && !canEditFabrics(session.role)) throw new Error("forbidden");
  const [fabrics, catalogs] = await Promise.all([Promise.all(ids.map((id) => getFabric(id))), status === "published" ? getCatalogs() : Promise.resolve([])]);
  const titles: string[] = [];
  for (const fabric of fabrics) {
    if (!fabric) continue;
    const next = { ...fabric, status, updatedAt: new Date().toISOString() };
    await saveFabric(next);
    if (status === "published") titles.push(...matchingCatalogs(next, catalogs).map((catalog) => catalog.title.ru));
  }
  touch("/admin/fabrics");
  return { ok: true as const, catalogs: [...new Set(titles)] };
  });
}

export async function deleteFabricAction(id: string) {
  return catchQuota(async () => {
    await actor(isAdmin);
    await deleteFabric(id);
    touch("/admin/fabrics");
    return { ok: true as const };
  });
}

export async function addCatalogDesignEntryAction(input: {
  catalogSlug: string;
  art: string;
  nameRu: string;
  design: Fabric["design"];
  sectionId?: string;
}) {
  return catchQuota(async () => {
  const gate = await catalogActor();
  if (!gate.ok) return gate;
  const { session } = gate;
  const catalog = await getCatalog(input.catalogSlug);
  if (!catalog) return { ok: false as const, error: "missing" as const };
  const art = input.art.trim();
  const nameRu = input.nameRu.trim();
  if (!art || !nameRu || !input.design.webUrl) return { ok: false as const, error: "invalid" as const };
  const fabric: Fabric = {
    ...emptyFabric(session.uid, "printed"),
    art,
    name: { ru: nameRu, en: "", uz: "" },
    design: { ...input.design, seamless: input.design.seamless ?? true },
    designCatalogEntry: true,
    status: "published",
  };
  const saved = await persistFabric(session, fabric);
  if (!saved.ok) return saved;
  const fabricId = saved.fabric.id;
  let catalogSections = catalog.catalogSections;
  if (input.sectionId && catalogSections?.length) {
    catalogSections = catalogSections.map((section) =>
      section.id === input.sectionId ? { ...section, fabricIds: [...section.fabricIds, fabricId] } : section,
    );
  }
  const fabricIds = [...new Set([...(catalog.fabricIds ?? []), fabricId])];
  const ordered = catalogHasManualSections({ ...catalog, catalogSections, fabricIds })
    ? catalogFabricIdOrder({ ...catalog, catalogSections, fabricIds })
    : fabricIds;
  await saveCatalog({
    ...catalog,
    catalogSections,
    fabricIds: ordered,
    mode: "manual",
    updatedAt: new Date().toISOString(),
  });
  touch(`/admin/catalogs/${input.catalogSlug}`);
  touch(`/c/${input.catalogSlug}`);
  touch("/admin/fabrics");
  return {
    ok: true as const,
    fabricId,
    fabric: saved.fabric,
    fabricIds: ordered,
    catalogSections,
  };
  });
}

function touchCatalog(slug: string) {
  touch(`/admin/catalogs/${slug}`);
  touch(`/c/${slug}`);
}

export async function addFabricsToCatalogAction(ids: string[], slug: string) {
  return catchQuota(async () => {
    await actor(canEditCatalogs);
    const catalog = await getCatalog(slug);
    if (!catalog) return { ok: false as const, error: "missing" };
    await saveCatalog({ ...catalogWithFabrics(catalog, ids), updatedAt: new Date().toISOString() });
    touchCatalog(slug);
    return { ok: true as const };
  });
}

export async function removeFabricFromCatalogAction(fabricId: string, slug: string) {
  return catchQuota(async () => {
    await actor(canEditCatalogs);
    const catalog = await getCatalog(slug);
    if (!catalog) return { ok: false as const, error: "missing" as const };
    await saveCatalog({ ...catalogWithoutFabric(catalog, fabricId), updatedAt: new Date().toISOString() });
    touchCatalog(slug);
    return { ok: true as const };
  });
}

/** One read and one write per catalogue that actually changed. */
export async function syncFabricCatalogsAction(fabricId: string, add: string[], remove: string[]) {
  return catchQuota(async () => {
    await actor(canEditCatalogs);
    const addSet = new Set(add);
    const slugs = [...new Set([...add, ...remove])].filter(Boolean);
    if (!fabricId || !slugs.length) return { ok: true as const };
    const loaded = await Promise.all(slugs.map(async (slug) => ({ slug, catalog: await getCatalog(slug) })));
    if (loaded.some((item) => !item.catalog)) return { ok: false as const, error: "missing" as const };
    const now = new Date().toISOString();
    for (const item of loaded) {
      const catalog = item.catalog;
      if (!catalog) continue;
      const next = addSet.has(item.slug) ? catalogWithFabrics(catalog, [fabricId]) : catalogWithoutFabric(catalog, fabricId);
      await saveCatalog({ ...next, updatedAt: now });
      touchCatalog(item.slug);
    }
    return { ok: true as const };
  });
}

export async function createCatalogAction(catalog: Catalog, pin?: string) {
  const gate = await catalogActor();
  if (!gate.ok) return gate;
  const { session } = gate;
  try {
    const titleRu = catalog.title.ru.trim();
    if (!titleRu) return { ok: false as const, error: "title" as const };
    const db = await getDictionaries();
    const slug = await uniqueCatalogSlug(titleRu);
    const pinHash = pin ? hashPin(pin) : catalog.access === "pin" ? catalog.pinHash : undefined;
    const showProductTypes =
      catalog.catalogKind === "design"
        ? catalog.showProductTypes
        : catalog.showProductTypes.length
          ? catalog.showProductTypes
          : db.productTypes.filter((item) => item.active).map((item) => item.id);
    const next: Catalog = {
      ...catalog,
      slug,
      title: { ru: titleRu, en: catalog.title.en.trim(), uz: catalog.title.uz.trim() },
      subtitle: catalog.subtitle,
      showProductTypes,
      mode: "manual",
      fabricIds: catalog.fabricIds ?? [],
      cover: { ...catalog.cover },
      createdBy: session.uid,
      updatedAt: new Date().toISOString(),
      ...(pinHash ? { pinHash } : {}),
    };
    delete next.expiresAt;
    delete next.rules;
    if (catalog.access !== "pin") delete next.pinHash;
    await saveCatalog(next);
    touch("/admin/catalogs");
    touch(`/c/${slug}`);
    return { ok: true as const, slug };
  } catch (error) {
    console.error("createCatalogAction", error);
    return { ok: false as const, error: actionErrorFromUnknown(error) };
  }
}

export async function deleteCatalogAction(slug: string) {
  return catchQuota(async () => {
    await actor(canEditCatalogs);
    await deleteCatalog(slug);
    touch("/admin/catalogs");
    return { ok: true as const };
  });
}

export async function saveCatalogAction(catalog: Catalog, pin?: string) {
  const gate = await catalogActor();
  if (!gate.ok) return gate;
  const { session } = gate;
  try {
    const previous = await getCatalog(catalog.slug);
    const needsPin = catalog.access === "pin";
    const pinHash = pin ? hashPin(pin) : needsPin ? catalog.pinHash || previous?.pinHash : undefined;
    const titleRu = catalog.title.ru.trim();
    if (!titleRu) return { ok: false as const, error: "title" as const };
    const next: Catalog = {
      ...catalog,
      title: { ...catalog.title, ru: titleRu },
      cover: { ...catalog.cover },
      createdBy: previous?.createdBy ?? session.uid,
      updatedAt: new Date().toISOString(),
      ...(pinHash ? { pinHash } : {}),
    };
    delete next.expiresAt;
    if (!needsPin) delete next.pinHash;
    await saveCatalog(next);
    touch(`/c/${catalog.slug}`);
    touch("/admin/catalogs");
    return { ok: true as const };
  } catch (error) {
    console.error("saveCatalogAction", error);
    return { ok: false as const, error: actionErrorFromUnknown(error) };
  }
}

export async function quickCatalogAction(title: string) {
  return catchQuota(async () => {
  const session = await actor(canEditCatalogs);
  const db = await getDictionaries();
  const slug = await uniqueCatalogSlug(title);
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
  });
}

export async function presetCatalogAction(preset: string) {
  return catchQuota(async () => {
    const session = await actor(canEditCatalogs);
    const db = await getDictionaries();
    const draft = presetCatalog(preset, "tmp", session.uid, db.productTypes);
    const slug = await uniqueCatalogSlug(draft.title.ru);
    await saveCatalog({ ...draft, slug });
    return { ok: true as const, slug };
  });
}

export async function createCollectionAction(input: { nameRu: string; autoCatalog: boolean }) {
  return catchQuota(async () => {
  const session = await actor(canEditDictionaries);
  const db = await getDictionaries();
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
    const slug = await uniqueCatalogSlug(input.nameRu);
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
  });
}

export async function saveCollectionAction(item: Collection) {
  return catchQuota(async () => {
    await actor(canEditDictionaries);
    await saveCollection(item);
    return { ok: true as const };
  });
}

export async function createFabricTypeAction(input: { nameRu: string; suggestedProductTypes: string[] }) {
  return catchQuota(async () => {
  await actor(canEditDictionaries);
  const db = await getDictionaries();
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
  });
}

export async function saveFabricTypeAction(item: FabricType) {
  return catchQuota(async () => {
    await actor(canEditDictionaries);
    await saveFabricType(item);
    return { ok: true as const };
  });
}

export async function createProductTypeAction(input: { nameRu: string; suggestedFor: string[] }) {
  return catchQuota(async () => {
  await actor(canEditDictionaries);
  const db = await getDictionaries();
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
  });
}

export async function saveProductTypeAction(item: ProductType) {
  return catchQuota(async () => {
    await actor(canEditDictionaries);
    await saveProductType(item);
    return { ok: true as const };
  });
}

export async function createFinishAction(input: { nameRu: string }) {
  return catchQuota(async () => {
  await actor(canEditDictionaries);
  const db = await getDictionaries();
  const id = uniqueSlug(input.nameRu, db.finishes.map((item) => item.id));
  const translated = await translateFields({ name: input.nameRu }, db.glossary);
  const item: Finish = {
    id,
    name: { ru: input.nameRu, en: translated.en.name || input.nameRu, uz: translated.uz.name || input.nameRu },
    order: db.finishes.length + 1,
    active: true,
  };
  await saveFinish(item);
  touch("/admin/settings");
  return { ok: true as const, item };
  });
}

export async function saveFinishAction(item: Finish) {
  return catchQuota(async () => {
    await actor(canEditDictionaries);
    await saveFinish(item);
    touch("/admin/settings");
    return { ok: true as const };
  });
}

export async function removeFinishAction(id: string) {
  return catchQuota(async () => {
  await actor(isAdmin);
  if (await isDictionaryItemUsed("finishes", id)) return { ok: false as const, error: "used" };
  await deleteFinish(id);
  touch("/admin/settings");
  return { ok: true as const };
  });
}

export async function reorderFinishesAction(ids: string[]) {
  return catchQuota(async () => {
  await actor(canEditDictionaries);
  const db = await getDictionaries();
  for (const [index, id] of ids.entries()) {
    const item = db.finishes.find((row) => row.id === id);
    if (item) await saveFinish({ ...item, order: index + 1 });
  }
  return { ok: true as const };
  });
}

export async function removeDictionaryAction(kind: "collections" | "fabricTypes" | "productTypes", id: string) {
  return catchQuota(async () => {
  await actor(isAdmin);
  if (await isDictionaryItemUsed(kind, id)) return { ok: false as const, error: "used" };
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
  });
}

export async function saveGlossaryAction(terms: GlossaryTerm[]) {
  return catchQuota(async () => {
    await actor(isAdmin);
    await saveGlossary(terms);
    return { ok: true as const };
  });
}

export async function saveTemplateAction(template: Template) {
  return catchQuota(async () => {
    await actor(isAdmin);
    await saveTemplate(template);
    touch("/admin/templates");
    return { ok: true as const };
  });
}

export async function deleteTemplateAction(id: string) {
  return catchQuota(async () => {
    await actor(isAdmin);
    await deleteTemplate(id);
    touch("/admin/templates");
    return { ok: true as const };
  });
}

export async function updateLeadAction(id: string, status: Lead["status"]) {
  return catchQuota(async () => {
  await actor(canReadLeads);
  const { getLead } = await import("@/lib/db");
  const lead = await getLead(id);
  if (!lead) return { ok: false as const };
  await saveLead({ ...lead, status });
  return { ok: true as const };
  });
}

export async function createUserAction(input: { email: string; name: string; role: Role; password: string; sections?: AdminSection[] }) {
  return catchQuota(async () => {
  await actor(isAdmin);
  const users = await getUsers();
  if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) return { ok: false as const, error: "exists" };
  const user: AppUser = {
    id: crypto.randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    passwordHash: hashPassword(input.password),
    sections: input.role === "admin" || !input.sections?.length ? undefined : input.sections,
  };
  await saveUser(user);
  revalidatePath("/admin/settings");
  return { ok: true as const };
  });
}

export async function updateUserAccessAction(input: { id: string; role: Role; sections: AdminSection[] | null }) {
  return catchQuota(async () => {
  await actor(isAdmin);
  const users = await getUsers();
  const user = users.find((item) => item.id === input.id);
  if (!user) return { ok: false as const, error: "missing" as const };
  const next: AppUser = {
    ...user,
    role: input.role,
    sections: input.role === "admin" || !input.sections?.length ? undefined : input.sections,
  };
  await saveUser(next);
  revalidatePath("/admin/settings");
  return { ok: true as const };
  });
}

export async function deleteUserAction(id: string) {
  return catchQuota(async () => {
    const session = await actor(isAdmin);
    if (session.uid === id) return { ok: false as const, error: "self" };
    await deleteUser(id);
    return { ok: true as const };
  });
}

export async function reorderAction(kind: "collections" | "fabricTypes" | "productTypes", ids: string[]) {
  return catchQuota(async () => {
  await actor(canEditDictionaries);
  const db = await getDictionaries();
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
  });
}
