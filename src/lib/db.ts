import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getFirestore, type DocumentData, type Firestore, Timestamp } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { withDefaultFinishes } from "@/lib/finishes";
import type { AnalyticsEvent, AppUser, Catalog, Collection, Database, Fabric, FabricType, Finish, GlossaryTerm, Lead, ProductType, Template } from "@/types";

const seedPath = path.join(process.cwd(), "data", "seed.json");
const runtimePath = path.join(process.cwd(), "data", "runtime.json");

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isTimestamp(value: unknown): value is Timestamp {
  return Boolean(value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function");
}

function fromRemote(value: unknown): unknown {
  if (isTimestamp(value)) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(fromRemote);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) output[key] = fromRemote(item);
    return output;
  }
  return value;
}

const DATE_KEYS = new Set(["createdAt", "updatedAt", "generatedAt", "expiresAt", "publishedAfter", "ts"]);

function toRemote(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(toRemote).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      if (DATE_KEYS.has(key) && typeof item === "string") {
        output[key] = Timestamp.fromDate(new Date(item));
        continue;
      }
      const next = toRemote(item);
      if (next !== undefined) output[key] = next;
    }
    return output;
  }
  return value;
}

const LOCAL_COLLECTION: Partial<Record<string, keyof Database>> = {
  catalogs: "catalogs",
  fabrics: "fabrics",
  collections: "collections",
  fabricTypes: "fabricTypes",
  finishes: "finishes",
  productTypes: "productTypes",
  templates: "templates",
  leads: "leads",
  events: "events",
  users: "users",
};

function firestoreDb(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

function firestore(): Firestore {
  const db = firestoreDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function readLocalCollection<T>(name: string, idField?: keyof T): T[] {
  const key = LOCAL_COLLECTION[name];
  if (!key) return [];
  const db = readLocal();
  const rows = db[key];
  if (!Array.isArray(rows)) return [];
  return rows as T[];
}

function readLocal(): Database {
  const file = existsSync(runtimePath) ? runtimePath : seedPath;
  if (!existsSync(file)) throw new Error("Missing data/seed.json. Run npm run generate.");
  return JSON.parse(readFileSync(file, "utf8")) as Database;
}

function writeLocal(db: Database) {
  mkdirSync(path.dirname(runtimePath), { recursive: true });
  writeFileSync(runtimePath, JSON.stringify(db));
}

async function mutate(fn: (db: Database) => void) {
  if (firebaseAdminConfigured()) throw new Error("Local mutate called while Firebase is configured");
  await withLock(async () => {
    const db = readLocal();
    fn(db);
    writeLocal(db);
  });
}

async function readCollection<T>(name: string, idField?: keyof T): Promise<T[]> {
  if (!firebaseAdminConfigured()) return readLocalCollection<T>(name, idField);
  const db = firestoreDb();
  if (!db) return readLocalCollection<T>(name, idField);
  try {
    const snap = await db.collection(name).get();
    return snap.docs.map((doc) => {
      const data = fromRemote(doc.data()) as T;
      if (idField && !(data as Record<string, unknown>)[idField as string]) {
        (data as Record<string, unknown>)[idField as string] = doc.id;
      }
      return data;
    });
  } catch (error) {
    console.error(`readCollection:${name}`, error);
    return readLocalCollection<T>(name, idField);
  }
}

function staffFromLocalSeed(email: string) {
  return readLocal().users.find((item) => item.email.toLowerCase() === email) ?? null;
}

export async function findStaffUser(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  if (firebaseAdminConfigured()) {
    try {
      const snap = await firestore().collection("users").get();
      for (const doc of snap.docs) {
        const user = fromRemote(doc.data()) as AppUser;
        if (!user.id) user.id = doc.id;
        if (user.email.toLowerCase() === normalized) return user;
      }
    } catch (error) {
      console.error("findStaffUser", error);
    }
  }
  return staffFromLocalSeed(normalized);
}

export async function getCatalogListData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { catalogs: db.catalogs, fabrics: db.fabrics };
  }
  const [catalogs, fabrics] = await Promise.all([
    readCollection<Catalog>("catalogs", "slug"),
    readCollection<Fabric>("fabrics", "id"),
  ]);
  return { catalogs, fabrics };
}

async function readDoc<T>(name: string, id: string, idField: keyof T): Promise<T | null> {
  if (!firebaseAdminConfigured()) {
    return readLocalCollection<T>(name, idField).find((item) => String((item as Record<string, unknown>)[idField as string]) === id) ?? null;
  }
  const db = firestoreDb();
  if (!db) {
    return readLocalCollection<T>(name, idField).find((item) => String((item as Record<string, unknown>)[idField as string]) === id) ?? null;
  }
  try {
    const snap = await db.collection(name).doc(id).get();
    if (!snap.exists) return null;
    const data = fromRemote(snap.data()) as T;
    if (!(data as Record<string, unknown>)[idField as string]) (data as Record<string, unknown>)[idField as string] = snap.id;
    return data;
  } catch (error) {
    console.error(`readDoc:${name}/${id}`, error);
    return readLocalCollection<T>(name, idField).find((item) => String((item as Record<string, unknown>)[idField as string]) === id) ?? null;
  }
}

async function readGlossary(): Promise<GlossaryTerm[]> {
  if (!firebaseAdminConfigured()) return readLocal().glossary;
  const db = firestoreDb();
  if (!db) return readLocal().glossary;
  try {
    const snap = await db.doc("settings/glossary").get();
    const data = snap.exists ? (fromRemote(snap.data()) as { terms?: GlossaryTerm[] }) : undefined;
    return data?.terms ?? readLocal().glossary;
  } catch (error) {
    console.error("readGlossary", error);
    return readLocal().glossary;
  }
}

export async function getFabric(id: string): Promise<Fabric | null> {
  if (!firebaseAdminConfigured()) return readLocal().fabrics.find((item) => item.id === id) ?? null;
  return readDoc<Fabric>("fabrics", id, "id");
}

export async function getFabrics(): Promise<Fabric[]> {
  if (!firebaseAdminConfigured()) return readLocal().fabrics;
  return readCollection<Fabric>("fabrics", "id");
}

export async function getCatalog(slug: string): Promise<Catalog | null> {
  if (!firebaseAdminConfigured()) return readLocal().catalogs.find((item) => item.slug === slug) ?? null;
  return readDoc<Catalog>("catalogs", slug, "slug");
}

export async function getCatalogs(): Promise<Catalog[]> {
  if (!firebaseAdminConfigured()) return readLocal().catalogs;
  return readCollection<Catalog>("catalogs", "slug");
}

export async function getGlossary(): Promise<GlossaryTerm[]> {
  if (!firebaseAdminConfigured()) return readLocal().glossary;
  return readGlossary();
}

export async function getDictionaries() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { collections: db.collections, fabricTypes: db.fabricTypes, finishes: withDefaultFinishes(db.finishes), productTypes: db.productTypes, glossary: db.glossary };
  }
  const [collections, fabricTypes, finishes, productTypes, glossary] = await Promise.all([
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<Finish>("finishes", "id"),
    readCollection<ProductType>("productTypes", "id"),
    readGlossary(),
  ]);
  return { collections, fabricTypes, finishes: withDefaultFinishes(finishes), productTypes, glossary };
}

/** Article numbers only, so the uniqueness check does not download every fabric's mockups. */
export async function isFabricArtTaken(art: string, exceptId: string): Promise<boolean> {
  const wanted = art.trim().toLowerCase();
  if (!wanted) return false;
  if (!firebaseAdminConfigured()) {
    return readLocal().fabrics.some((item) => item.id !== exceptId && item.art.toLowerCase() === wanted);
  }
  const db = firestoreDb();
  if (!db) {
    return readLocal().fabrics.some((item) => item.id !== exceptId && item.art.toLowerCase() === wanted);
  }
  try {
    const snap = await db.collection("fabrics").select("art").get();
    return snap.docs.some((doc) => doc.id !== exceptId && String(doc.get("art") ?? "").toLowerCase() === wanted);
  } catch (error) {
    console.error("isFabricArtTaken", error);
    return readLocal().fabrics.some((item) => item.id !== exceptId && item.art.toLowerCase() === wanted);
  }
}

export async function getFabricsBoardData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { fabrics: db.fabrics, collections: db.collections, fabricTypes: db.fabricTypes, productTypes: db.productTypes, catalogs: db.catalogs };
  }
  const [fabrics, collections, fabricTypes, productTypes, catalogs] = await Promise.all([
    readCollection<Fabric>("fabrics", "id"),
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<ProductType>("productTypes", "id"),
    readCollection<Catalog>("catalogs", "slug"),
  ]);
  return { fabrics, collections, fabricTypes, productTypes, catalogs };
}

export async function getLeadsData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { leads: db.leads, fabrics: db.fabrics };
  }
  const [leads, fabrics] = await Promise.all([readCollection<Lead>("leads", "id"), readCollection<Fabric>("fabrics", "id")]);
  return { leads, fabrics };
}

export async function getStatsData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { catalogs: db.catalogs, events: db.events, leads: db.leads, fabrics: db.fabrics };
  }
  const [catalogs, events, leads, fabrics] = await Promise.all([
    readCollection<Catalog>("catalogs", "slug"),
    readCollection<AnalyticsEvent>("events", "id"),
    readCollection<Lead>("leads", "id"),
    readCollection<Fabric>("fabrics", "id"),
  ]);
  return { catalogs, events, leads, fabrics };
}

export async function getUsers(): Promise<AppUser[]> {
  if (!firebaseAdminConfigured()) return readLocal().users;
  return readCollection<AppUser>("users", "id");
}

export async function getCatalogEditorData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return {
      catalogs: db.catalogs,
      fabrics: db.fabrics,
      collections: db.collections,
      fabricTypes: db.fabricTypes,
      productTypes: db.productTypes,
    };
  }
  const [catalogs, fabrics, collections, fabricTypes, productTypes] = await Promise.all([
    readCollection<Catalog>("catalogs", "slug"),
    readCollection<Fabric>("fabrics", "id"),
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<ProductType>("productTypes", "id"),
  ]);
  return { catalogs, fabrics, collections, fabricTypes, productTypes };
}

export async function getDb(): Promise<Database> {
  if (!firebaseAdminConfigured()) return readLocal();
  const fs = firestore();
  const [collections, fabricTypes, productTypes, templates, fabrics, catalogs, leads, events, users, glossarySnap] = await Promise.all([
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<ProductType>("productTypes", "id"),
    readCollection<Template>("templates", "id"),
    readCollection<Fabric>("fabrics", "id"),
    readCollection<Catalog>("catalogs", "slug"),
    readCollection<Lead>("leads", "id"),
    readCollection<AnalyticsEvent>("events", "id"),
    readCollection<AppUser>("users", "id"),
    fs.doc("settings/glossary").get(),
  ]);
  const glossaryData = glossarySnap.exists ? (fromRemote(glossarySnap.data()) as { terms?: GlossaryTerm[] }) : undefined;
  return {
    collections,
    fabricTypes,
    productTypes,
    templates,
    fabrics,
    catalogs,
    leads,
    events,
    users,
    glossary: glossaryData?.terms ?? [],
  };
}

function omitUndefined(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(omitUndefined).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      const next = omitUndefined(item);
      if (next !== undefined) output[key] = next;
    }
    return output;
  }
  return value;
}

async function upsert(collection: string, id: string, value: object) {
  await firestore().collection(collection).doc(id).set(toRemote(omitUndefined(value)) as DocumentData);
}

export async function saveFabric(fabric: Fabric) {
  if (firebaseAdminConfigured()) return upsert("fabrics", fabric.id, fabric);
  await mutate((db) => {
    const index = db.fabrics.findIndex((item) => item.id === fabric.id);
    if (index >= 0) db.fabrics[index] = fabric;
    else db.fabrics.push(fabric);
  });
}

export async function deleteFabric(id: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("fabrics").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.fabrics = db.fabrics.filter((item) => item.id !== id);
  });
}

export async function saveCatalog(catalog: Catalog) {
  if (firebaseAdminConfigured()) return upsert("catalogs", catalog.slug, catalog);
  await mutate((db) => {
    const index = db.catalogs.findIndex((item) => item.slug === catalog.slug);
    if (index >= 0) db.catalogs[index] = catalog;
    else db.catalogs.push(catalog);
  });
}

export async function deleteCatalog(slug: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("catalogs").doc(slug).delete();
    return;
  }
  await mutate((db) => {
    db.catalogs = db.catalogs.filter((item) => item.slug !== slug);
  });
}

export async function saveCollection(item: Collection) {
  if (firebaseAdminConfigured()) return upsert("collections", item.id, item);
  await mutate((db) => {
    const index = db.collections.findIndex((row) => row.id === item.id);
    if (index >= 0) db.collections[index] = item;
    else db.collections.push(item);
  });
}

export async function deleteCollection(id: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("collections").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.collections = db.collections.filter((item) => item.id !== id);
  });
}

export async function saveFabricType(item: FabricType) {
  if (firebaseAdminConfigured()) return upsert("fabricTypes", item.id, item);
  await mutate((db) => {
    const index = db.fabricTypes.findIndex((row) => row.id === item.id);
    if (index >= 0) db.fabricTypes[index] = item;
    else db.fabricTypes.push(item);
  });
}

/** The first edit stores the whole default list, so the directory never loses the presets. */
export async function saveFinish(item: Finish) {
  const current = (await getDictionaries()).finishes;
  const rows = current.some((row) => row.id === item.id) ? current.map((row) => (row.id === item.id ? item : row)) : [...current, item];
  if (firebaseAdminConfigured()) {
    await Promise.all(rows.map((row) => upsert("finishes", row.id, row)));
    return;
  }
  await mutate((db) => {
    db.finishes = rows;
  });
}

export async function deleteFinish(id: string) {
  const rows = (await getDictionaries()).finishes.filter((item) => item.id !== id);
  if (firebaseAdminConfigured()) {
    await Promise.all(rows.map((row) => upsert("finishes", row.id, row)));
    await firestore().collection("finishes").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.finishes = rows;
  });
}

export async function deleteFabricType(id: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("fabricTypes").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.fabricTypes = db.fabricTypes.filter((item) => item.id !== id);
  });
}

export async function saveProductType(item: ProductType) {
  if (firebaseAdminConfigured()) return upsert("productTypes", item.id, item);
  await mutate((db) => {
    const index = db.productTypes.findIndex((row) => row.id === item.id);
    if (index >= 0) db.productTypes[index] = item;
    else db.productTypes.push(item);
  });
}

export async function deleteProductType(id: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("productTypes").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.productTypes = db.productTypes.filter((item) => item.id !== id);
  });
}

export async function saveTemplate(item: Template) {
  if (firebaseAdminConfigured()) return upsert("templates", item.id, item);
  await mutate((db) => {
    const index = db.templates.findIndex((row) => row.id === item.id);
    if (index >= 0) db.templates[index] = item;
    else db.templates.push(item);
  });
}

export async function deleteTemplate(id: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("templates").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.templates = db.templates.filter((item) => item.id !== id);
  });
}

export async function getTemplatesListData() {
  if (!firebaseAdminConfigured()) return readLocal().templates;
  return readCollection<Template>("templates", "id");
}

export async function getTemplatesBoardData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { templates: db.templates, productTypes: db.productTypes };
  }
  const [templates, productTypes] = await Promise.all([
    readCollection<Template>("templates", "id"),
    readCollection<ProductType>("productTypes", "id"),
  ]);
  return { templates, productTypes };
}

export async function getFabricEditorData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { catalogs: db.catalogs, collections: db.collections, fabricTypes: db.fabricTypes, finishes: withDefaultFinishes(db.finishes), productTypes: db.productTypes, templates: db.templates };
  }
  const [catalogs, collections, fabricTypes, finishes, productTypes, templates] = await Promise.all([
    readCollection<Catalog>("catalogs", "slug"),
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<Finish>("finishes", "id"),
    readCollection<ProductType>("productTypes", "id"),
    readCollection<Template>("templates", "id"),
  ]);
  return { catalogs, collections, fabricTypes, finishes: withDefaultFinishes(finishes), productTypes, templates };
}

export async function saveLead(item: Lead) {
  if (firebaseAdminConfigured()) return upsert("leads", item.id, item);
  await mutate((db) => {
    const index = db.leads.findIndex((row) => row.id === item.id);
    if (index >= 0) db.leads[index] = item;
    else db.leads.unshift(item);
  });
}

export async function saveEvents(items: AnalyticsEvent[]) {
  if (firebaseAdminConfigured()) {
    const batch = firestore().batch();
    for (const item of items) batch.set(firestore().collection("events").doc(item.id), toRemote(item) as DocumentData);
    await batch.commit();
    return;
  }
  await mutate((db) => {
    db.events.push(...items);
    if (db.events.length > 5000) db.events = db.events.slice(-5000);
  });
}

export async function saveGlossary(terms: GlossaryTerm[]) {
  if (firebaseAdminConfigured()) {
    await firestore().doc("settings/glossary").set({ terms: toRemote(terms) as DocumentData[] });
    return;
  }
  await mutate((db) => {
    db.glossary = terms;
  });
}

export async function saveUser(user: AppUser) {
  if (firebaseAdminConfigured()) return upsert("users", user.id, user);
  await mutate((db) => {
    const index = db.users.findIndex((row) => row.id === user.id);
    if (index >= 0) db.users[index] = user;
    else db.users.push(user);
  });
}

export async function deleteUser(id: string) {
  if (firebaseAdminConfigured()) {
    await firestore().collection("users").doc(id).delete();
    return;
  }
  await mutate((db) => {
    db.users = db.users.filter((item) => item.id !== id);
  });
}

export async function replaceFabrics(fabrics: Fabric[]) {
  if (firebaseAdminConfigured()) {
    for (const fabric of fabrics) await saveFabric(fabric);
    return;
  }
  await mutate((db) => {
    db.fabrics = fabrics;
  });
}
