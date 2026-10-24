import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getFirestore, type DocumentData, type Firestore, Timestamp } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import type { AnalyticsEvent, AppUser, Catalog, Collection, Database, Fabric, FabricType, GlossaryTerm, Lead, ProductType, Template } from "@/types";

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

function firestore(): Firestore {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  return getFirestore(app);
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
  const snap = await firestore().collection(name).get();
  return snap.docs.map((doc) => {
    const data = fromRemote(doc.data()) as T;
    if (idField && !(data as Record<string, unknown>)[idField as string]) {
      (data as Record<string, unknown>)[idField as string] = doc.id;
    }
    return data;
  });
}

export async function findStaffUser(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  if (!firebaseAdminConfigured()) {
    return readLocal().users.find((item) => item.email.toLowerCase() === normalized) ?? null;
  }
  const snap = await firestore().collection("users").get();
  for (const doc of snap.docs) {
    const user = fromRemote(doc.data()) as AppUser;
    if (!user.id) user.id = doc.id;
    if (user.email.toLowerCase() === normalized) return user;
  }
  return null;
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

export async function getFabricEditorData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { catalogs: db.catalogs, collections: db.collections, fabricTypes: db.fabricTypes, productTypes: db.productTypes, templates: db.templates };
  }
  const [catalogs, collections, fabricTypes, productTypes, templates] = await Promise.all([
    readCollection<Catalog>("catalogs", "slug"),
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<ProductType>("productTypes", "id"),
    readCollection<Template>("templates", "id"),
  ]);
  return { catalogs, collections, fabricTypes, productTypes, templates };
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
