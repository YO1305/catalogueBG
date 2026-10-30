import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getFirestore, type DocumentData, type Firestore, type Query, Timestamp } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { defaultStatsRange, listCatalogDayStats, recordCatalogDayStats, summarizeDayStats } from "@/lib/catalogDayStats";
import { FirestoreQuotaError, FirestoreTimeoutError, isFirestoreQuotaError, withFirestoreGuard } from "@/lib/firestoreGuard";
import { trackFirestoreDelete, trackFirestoreRead, trackFirestoreWrite } from "@/lib/firestoreMetrics";
import { fabricMatchesRules } from "@/lib/catalog";
import { emptyCatalogStats, summarizeCatalog } from "@/lib/analytics";
import { fabricTemplateIds, fabricUsesTemplate } from "@/lib/fabricTemplateIds";
import { withDefaultFinishes } from "@/lib/finishes";
import { slugify } from "@/lib/ids";
import type { AnalyticsEvent, AppUser, Catalog, Collection, Database, Fabric, FabricPickerRow, FabricType, Finish, GlossaryTerm, Lead, ProductType, Template } from "@/types";

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

export class FirestoreUnavailableError extends Error {
  constructor(source: string, cause?: unknown) {
    super(`firestore_unavailable:${source}`);
    this.name = "FirestoreUnavailableError";
    if (cause !== undefined) this.cause = cause;
  }
}

function firestoreDb(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

function requireFirestore(source: string): Firestore {
  const db = firestoreDb();
  if (!db) throw new FirestoreUnavailableError(source);
  return db;
}

function abortFirestoreRead(source: string, error: unknown): never {
  if (error instanceof FirestoreQuotaError || error instanceof FirestoreTimeoutError || error instanceof FirestoreUnavailableError) {
    throw error;
  }
  if (isFirestoreQuotaError(error)) throw new FirestoreQuotaError();
  console.error(source, error);
  throw new FirestoreUnavailableError(source, error);
}

async function fsOp<T>(start: () => Promise<T>): Promise<T> {
  return withFirestoreGuard(start);
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
  try {
    const db = requireFirestore(`collection:${name}`);
    const snap = await fsOp(() => db.collection(name).get());
    trackFirestoreRead(snap.size, `collection:${name}`);
    return snap.docs.map((doc) => {
      const data = fromRemote(doc.data()) as T;
      if (idField && !(data as Record<string, unknown>)[idField as string]) {
        (data as Record<string, unknown>)[idField as string] = doc.id;
      }
      return data;
    });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead(`readCollection:${name}`, error);
  }
}

const ADMIN_PAGE_SIZE = 50;
const ART_TAKEN_CACHE_MS = 30_000;
const artTakenCache = new Map<string, { taken: boolean; at: number }>();

function cursorFieldValue(item: Record<string, unknown>, orderBy: string): string {
  const value = item[orderBy];
  return typeof value === "string" ? value : String(value ?? "");
}

function startAfterCursor(orderBy: string, cursor: string): string | Timestamp {
  if (DATE_KEYS.has(orderBy)) {
    const date = new Date(cursor);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return cursor;
}

function forgetArtTakenCache(exceptId: string) {
  for (const key of [...artTakenCache.keys()]) {
    if (key.endsWith(`:${exceptId}`)) artTakenCache.delete(key);
  }
}

async function readCollectionPage<T>(
  name: string,
  idField: keyof T | undefined,
  options: { limit: number; cursor?: string | null; orderBy: string },
): Promise<{ items: T[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(options.limit, 1), ADMIN_PAGE_SIZE);
  const cursor = options.cursor?.trim() || null;
  if (!firebaseAdminConfigured()) {
    const all = readLocalCollection<T>(name, idField);
    const start = cursor ? all.findIndex((item) => cursorFieldValue(item as Record<string, unknown>, options.orderBy) === cursor) + 1 : 0;
    const items = all.slice(Math.max(start, 0), Math.max(start, 0) + limit);
    const last = items[items.length - 1] as Record<string, unknown> | undefined;
    return { items, nextCursor: items.length === limit && last ? cursorFieldValue(last, options.orderBy) : null };
  }
  try {
    const db = requireFirestore(`collectionPage:${name}`);
    let query = db.collection(name).orderBy(options.orderBy);
    if (cursor) query = query.startAfter(startAfterCursor(options.orderBy, cursor));
    const snap = await fsOp(() => query.limit(limit).get());
    trackFirestoreRead(snap.size, `collectionPage:${name}`);
    const items = snap.docs.map((doc) => {
      const data = fromRemote(doc.data()) as T;
      if (idField && !(data as Record<string, unknown>)[idField as string]) {
        (data as Record<string, unknown>)[idField as string] = doc.id;
      }
      return data;
    });
    const last = items[items.length - 1] as Record<string, unknown> | undefined;
    return { items, nextCursor: snap.size === limit && last ? cursorFieldValue(last, options.orderBy) : null };
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead(`readCollectionPage:${name}`, error);
  }
}

export async function getFabricsByIds(ids: string[]): Promise<Fabric[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  if (!firebaseAdminConfigured()) {
    const byId = new Map(readLocal().fabrics.map((item) => [item.id, item]));
    return unique.flatMap((id) => {
      const fabric = byId.get(id);
      return fabric ? [fabric] : [];
    });
  }
  try {
    const db = requireFirestore("fabrics:getAll");
    const refs = unique.map((id) => db.collection("fabrics").doc(id));
    const snaps = await fsOp(() => db.getAll(...refs));
    trackFirestoreRead(snaps.length, "fabrics:getAll");
    return snaps.flatMap((snap) => {
      if (!snap.exists) return [];
      const data = fromRemote(snap.data()) as Fabric;
      if (!data.id) data.id = snap.id;
      return [data];
    });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead("getFabricsByIds", error);
  }
}

function toPickerRow(fabric: Fabric): FabricPickerRow {
  return {
    id: fabric.id,
    art: fabric.art,
    name: fabric.name,
    thumbUrl: fabric.design?.thumbUrl || "",
    status: fabric.status,
    collectionId: fabric.collectionId,
    fabricTypeId: fabric.fabricTypeId,
  };
}

function pickerCursorKey(fabric: Fabric, query: string) {
  return query ? fabric.artKey || fabric.art.toLowerCase() : fabric.art;
}

function matchesPickerQuery(fabric: Fabric, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    fabric.art.toLowerCase().includes(q) ||
    fabric.name.ru.toLowerCase().includes(q) ||
    (fabric.name.en ?? "").toLowerCase().includes(q) ||
    (fabric.name.uz ?? "").toLowerCase().includes(q)
  );
}

function localFabricPickerPage(query: string, cursor: string | null, limit: number): { items: FabricPickerRow[]; cursor: string | null } {
  const rows = readLocal()
    .fabrics.filter((fabric) => fabric.status === "published" && matchesPickerQuery(fabric, query))
    .sort((a, b) => a.art.localeCompare(b.art, undefined, { numeric: true }));
  const start = cursor ? rows.findIndex((fabric) => pickerCursorKey(fabric, query) === cursor) + 1 : 0;
  const slice = rows.slice(Math.max(start, 0), Math.max(start, 0) + limit);
  const last = slice[slice.length - 1];
  return {
    items: slice.map(toPickerRow),
    cursor: slice.length === limit && last ? pickerCursorKey(last, query) : null,
  };
}

async function runFabricPickerQuery(
  db: Firestore,
  orderField: "art" | "artKey",
  query: string,
  cursor: string | null,
  limit: number,
  label: string,
) {
  let ref: Query = db.collection("fabrics").orderBy(orderField);
  if (query) {
    const start = orderField === "artKey" ? query.toLowerCase() : query;
    if (cursor) ref = ref.startAfter(cursor).endAt(`${start}\uf8ff`);
    else ref = ref.startAt(start).endAt(`${start}\uf8ff`);
  } else if (cursor) {
    ref = ref.startAfter(cursor);
  }
  const snap = await fsOp(() => ref.limit(limit).select("art", "artKey", "name", "status", "collectionId", "fabricTypeId", "design").get());
  trackFirestoreRead(snap.size, label);
  const rows = snap.docs.flatMap((doc) => {
    const data = fromRemote(doc.data()) as Fabric;
    if (!data.id) data.id = doc.id;
    if (data.status !== "published") return [];
    if (query && !matchesPickerQuery(data, query)) return [];
    return [data];
  });
  const lastDoc = snap.docs[snap.docs.length - 1];
  const last = lastDoc ? (fromRemote(lastDoc.data()) as Fabric) : null;
  return {
    items: rows.map(toPickerRow),
    cursor: snap.size === limit && last ? (orderField === "artKey" ? pickerCursorKey(last, query) : last.art) : null,
  };
}

export async function listFabricPickerPage(input: {
  query?: string;
  cursor?: string | null;
}): Promise<{ items: FabricPickerRow[]; cursor: string | null }> {
  const limit = ADMIN_PAGE_SIZE;
  const query = input.query?.trim() ?? "";
  const cursor = input.cursor?.trim() || null;
  if (!firebaseAdminConfigured()) return localFabricPickerPage(query, cursor, limit);
  const db = firestoreDb();
  if (!db) return { items: [], cursor: null };
  try {
    const page = await runFabricPickerQuery(db, "art", query, cursor, limit, "fabrics:picker");
    if (page.items.length || !query) return page;
    return await runFabricPickerQuery(db, "artKey", query, cursor, limit, "fabrics:picker-artKey");
  } catch (error) {
    if (error instanceof FirestoreQuotaError || error instanceof FirestoreTimeoutError) throw error;
    console.error("listFabricPickerPage", error);
    try {
      let ref: Query = db.collection("fabrics").orderBy("art");
      if (cursor) ref = ref.startAfter(cursor);
      const snap = await fsOp(() => ref.limit(limit).get());
      trackFirestoreRead(snap.size, "fabrics:picker-fallback");
      const rows = snap.docs.flatMap((doc) => {
        const data = fromRemote(doc.data()) as Fabric;
        if (!data.id) data.id = doc.id;
        if (data.status !== "published" || !matchesPickerQuery(data, query)) return [];
        return [data];
      });
      const last = rows[rows.length - 1];
      return {
        items: rows.map(toPickerRow),
        cursor: snap.size === limit && last ? last.art : null,
      };
    } catch (fallbackError) {
      if (fallbackError instanceof FirestoreQuotaError || fallbackError instanceof FirestoreTimeoutError) throw fallbackError;
      console.error("listFabricPickerPage fallback", fallbackError);
      return { items: [], cursor: null };
    }
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
      const snap = await fsOp(() => firestore().collection("users").where("email", "==", normalized).limit(1).get());
      trackFirestoreRead(snap.size, "users:email");
      const doc = snap.docs[0];
      if (!doc) return null;
      const user = fromRemote(doc.data()) as AppUser;
      if (!user.id) user.id = doc.id;
      return user;
    } catch (error) {
      if (error instanceof FirestoreQuotaError || error instanceof FirestoreTimeoutError) throw error;
      console.error("findStaffUser", error);
      return null;
    }
  }
  if (process.env.NODE_ENV === "production") return null;
  return staffFromLocalSeed(normalized);
}

export async function getCatalogListData(options?: { cursor?: string | null; pageSize?: number }) {
  const pageSize = Math.min(Math.max(options?.pageSize ?? ADMIN_PAGE_SIZE, 1), ADMIN_PAGE_SIZE);
  const cursor = options?.cursor ?? null;
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    const page = await readCollectionPage<Catalog>("catalogs", "slug", { limit: pageSize, cursor, orderBy: "slug" });
    const ids = [...new Set(page.items.flatMap((item) => item.fabricIds ?? []).filter(Boolean))];
    const byId = new Map(db.fabrics.map((item) => [item.id, item]));
    const fabrics = ids.flatMap((id) => {
      const fabric = byId.get(id);
      return fabric ? [fabric] : [];
    });
    return { catalogs: page.items, fabrics, cursor, nextCursor: page.nextCursor, hasMore: Boolean(page.nextCursor) };
  }
  const page = await readCollectionPage<Catalog>("catalogs", "slug", { limit: pageSize, cursor, orderBy: "slug" });
  const fabricIds = [...new Set(page.items.flatMap((item) => item.fabricIds ?? []).filter(Boolean))];
  const fabrics = await getFabricsByIds(fabricIds);
  return { catalogs: page.items, fabrics, cursor, nextCursor: page.nextCursor, hasMore: Boolean(page.nextCursor) };
}

async function readDoc<T>(name: string, id: string, idField: keyof T): Promise<T | null> {
  if (!firebaseAdminConfigured()) {
    return readLocalCollection<T>(name, idField).find((item) => String((item as Record<string, unknown>)[idField as string]) === id) ?? null;
  }
  try {
    const db = requireFirestore(`doc:${name}`);
    const snap = await fsOp(() => db.collection(name).doc(id).get());
    trackFirestoreRead(snap.exists ? 1 : 0, `doc:${name}`);
    if (!snap.exists) return null;
    const data = fromRemote(snap.data()) as T;
    if (!(data as Record<string, unknown>)[idField as string]) (data as Record<string, unknown>)[idField as string] = snap.id;
    return data;
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead(`readDoc:${name}/${id}`, error);
  }
}

async function readGlossary(): Promise<GlossaryTerm[]> {
  if (!firebaseAdminConfigured()) return readLocal().glossary;
  try {
    const db = requireFirestore("doc:settings/glossary");
    const snap = await fsOp(() => db.doc("settings/glossary").get());
    trackFirestoreRead(1, "doc:settings/glossary");
    const data = snap.exists ? (fromRemote(snap.data()) as { terms?: GlossaryTerm[] }) : undefined;
    return data?.terms ?? [];
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead("readGlossary", error);
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

export async function uniqueCatalogSlug(base: string): Promise<string> {
  const root = slugify(base);
  if (!(await getCatalog(root))) return root;
  for (let n = 2; n < 400; n += 1) {
    const candidate = `${root}-${n}`;
    if (!(await getCatalog(candidate))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function getCatalogs(): Promise<Catalog[]> {
  if (!firebaseAdminConfigured()) return readLocal().catalogs;
  return readCollection<Catalog>("catalogs", "slug");
}

export async function listCatalogsTouchingFabric(fabric: Fabric): Promise<Catalog[]> {
  const keep = (catalog: Catalog) => catalog.status !== "archived";
  if (!firebaseAdminConfigured()) {
    return readLocal().catalogs.filter(
      (catalog) =>
        keep(catalog) &&
        ((catalog.fabricIds ?? []).includes(fabric.id) || (catalog.mode === "rules" && fabricMatchesRules(fabric, catalog.rules ?? {}))),
    );
  }
  const db = firestore();
  const [manualSnap, rulesSnap] = await Promise.all([
    fsOp(() => db.collection("catalogs").where("fabricIds", "array-contains", fabric.id).get()),
    fsOp(() => db.collection("catalogs").where("mode", "==", "rules").get()),
  ]);
  trackFirestoreRead(manualSnap.size + rulesSnap.size, "catalogs:touching-fabric");
  const bySlug = new Map<string, Catalog>();
  for (const snap of [...manualSnap.docs, ...rulesSnap.docs]) {
    const catalog = fromRemote(snap.data()) as Catalog;
    if (!catalog.slug) catalog.slug = snap.id;
    if (!keep(catalog)) continue;
    if (catalog.mode === "rules" && !fabricMatchesRules(fabric, catalog.rules ?? {}) && !(catalog.fabricIds ?? []).includes(fabric.id)) continue;
    bySlug.set(catalog.slug, catalog);
  }
  return [...bySlug.values()];
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
  const cacheKey = `${wanted}:${exceptId}`;
  const hit = artTakenCache.get(cacheKey);
  if (hit && Date.now() - hit.at < ART_TAKEN_CACHE_MS) return hit.taken;
  const taken = await queryFabricArtTaken(wanted, art.trim(), exceptId);
  artTakenCache.set(cacheKey, { taken, at: Date.now() });
  return taken;
}

async function queryFabricArtTaken(wanted: string, raw: string, exceptId: string): Promise<boolean> {
  if (!firebaseAdminConfigured()) {
    return readLocal().fabrics.some((item) => item.id !== exceptId && item.art.toLowerCase() === wanted);
  }
  const db = firestoreDb();
  if (!db) {
    return readLocal().fabrics.some((item) => item.id !== exceptId && item.art.toLowerCase() === wanted);
  }
  try {
    const snap = await fsOp(() => db.collection("fabrics").where("artKey", "==", wanted).limit(4).get());
    trackFirestoreRead(snap.size, "fabrics:artKeyQuery");
    if (snap.size) return snap.docs.some((doc) => doc.id !== exceptId);
    const legacy = await fsOp(() => db.collection("fabrics").where("art", "==", raw).limit(4).get());
    trackFirestoreRead(legacy.size, "fabrics:artLegacyQuery");
    return legacy.docs.some((doc) => doc.id !== exceptId);
  } catch (error) {
    if (error instanceof FirestoreQuotaError || error instanceof FirestoreTimeoutError) throw error;
    console.error("isFabricArtTaken", error);
    return readLocal().fabrics.some((item) => item.id !== exceptId && item.art.toLowerCase() === wanted);
  }
}

export async function getFabricsBoardData(options?: { cursor?: string | null; pageSize?: number }) {
  const pageSize = Math.min(Math.max(options?.pageSize ?? ADMIN_PAGE_SIZE, 1), ADMIN_PAGE_SIZE);
  const cursor = options?.cursor ?? null;
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    const page = await readCollectionPage<Fabric>("fabrics", "id", { limit: pageSize, cursor, orderBy: "updatedAt" });
    return {
      fabrics: page.items,
      collections: db.collections,
      fabricTypes: db.fabricTypes,
      productTypes: db.productTypes,
      catalogs: db.catalogs.slice(0, pageSize),
      cursor,
      nextCursor: page.nextCursor,
      hasMore: Boolean(page.nextCursor),
    };
  }
  const [fabricsPage, collections, fabricTypes, productTypes, catalogsPage] = await Promise.all([
    readCollectionPage<Fabric>("fabrics", "id", { limit: pageSize, cursor, orderBy: "updatedAt" }),
    readCollection<Collection>("collections", "id"),
    readCollection<FabricType>("fabricTypes", "id"),
    readCollection<ProductType>("productTypes", "id"),
    readCollectionPage<Catalog>("catalogs", "slug", { limit: pageSize, orderBy: "slug" }),
  ]);
  return {
    fabrics: fabricsPage.items,
    collections,
    fabricTypes,
    productTypes,
    catalogs: catalogsPage.items,
    cursor,
    nextCursor: fabricsPage.nextCursor,
    hasMore: Boolean(fabricsPage.nextCursor),
  };
}

export async function listFabricsByTemplateId(templateId: string): Promise<Fabric[]> {
  if (!templateId) return [];
  if (!firebaseAdminConfigured()) {
    return readLocal().fabrics.filter((fabric) => fabricUsesTemplate(fabric, templateId));
  }
  try {
    const db = requireFirestore("fabrics:byTemplate");
    const snap = await fsOp(() => db.collection("fabrics").where("templateIds", "array-contains", templateId).get());
    trackFirestoreRead(snap.size, "fabrics:byTemplate");
    return snap.docs.map((doc) => {
      const data = fromRemote(doc.data()) as Fabric;
      if (!data.id) data.id = doc.id;
      return data;
    });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead("listFabricsByTemplateId", error);
  }
}

export async function listLeadsByCatalog(slug: string): Promise<Lead[]> {
  if (!slug) return [];
  if (!firebaseAdminConfigured()) return readLocal().leads.filter((lead) => lead.catalogSlug === slug);
  try {
    const db = requireFirestore("leads:byCatalog");
    const snap = await fsOp(() => db.collection("leads").where("catalogSlug", "==", slug).get());
    trackFirestoreRead(snap.size, "leads:byCatalog");
    return snap.docs.map((doc) => {
      const data = fromRemote(doc.data()) as Lead;
      if (!data.id) data.id = doc.id;
      return data;
    });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) throw error;
    abortFirestoreRead("listLeadsByCatalog", error);
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!firebaseAdminConfigured()) return readLocal().leads.find((item) => item.id === id) ?? null;
  return readDoc<Lead>("leads", id, "id");
}

export async function getLeadsData() {
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    return { leads: db.leads, fabrics: db.fabrics };
  }
  const [leads, fabrics] = await Promise.all([readCollection<Lead>("leads", "id"), readCollection<Fabric>("fabrics", "id")]);
  return { leads, fabrics };
}

export async function getStatsData(input?: { slug?: string; from?: string; to?: string }) {
  const period = defaultStatsRange(input?.from, input?.to);
  const pick = (catalogs: Catalog[]) =>
    input?.slug && catalogs.some((item) => item.slug === input.slug) ? input.slug : (catalogs[0]?.slug ?? "");
  if (!firebaseAdminConfigured()) {
    const db = readLocal();
    const selected = pick(db.catalogs);
    const summary = selected ? summarizeCatalog(selected, db.events, db.leads) : emptyCatalogStats();
    const fabrics = db.fabrics.filter((fabric) => summary.top.some((row) => row.fabricId === fabric.id));
    return { catalogs: db.catalogs, selected, summary, fabrics, from: period.from, to: period.to };
  }
  const catalogs = await getCatalogs();
  const selected = pick(catalogs);
  if (!selected) {
    return { catalogs, selected: "", summary: emptyCatalogStats(), fabrics: [] as Fabric[], from: period.from, to: period.to };
  }
  const [days, leads] = await Promise.all([listCatalogDayStats(selected, period.from, period.to), listLeadsByCatalog(selected)]);
  const summary = summarizeDayStats(days, leads.length);
  const fabrics = await getFabricsByIds(summary.top.map((row) => row.fabricId));
  return { catalogs, selected, summary, fabrics, from: period.from, to: period.to };
}

export async function getUsers(): Promise<AppUser[]> {
  if (!firebaseAdminConfigured()) return readLocal().users;
  return readCollection<AppUser>("users", "id");
}

export async function getCatalogWorkspace(slug?: string) {
  const [dictionaries, catalog] = await Promise.all([
    getDictionaries(),
    slug ? getCatalog(slug) : Promise.resolve(null),
  ]);
  const ids = catalog
    ? [...new Set([...(catalog.fabricIds ?? []), ...(catalog.catalogSections ?? []).flatMap((section) => section.fabricIds)])]
    : [];
  const fabrics = await getFabricsByIds(ids);
  return {
    catalog,
    fabrics,
    collections: dictionaries.collections,
    fabricTypes: dictionaries.fabricTypes,
    productTypes: dictionaries.productTypes,
  };
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
    fsOp(() => fs.doc("settings/glossary").get()),
  ]);
  trackFirestoreRead(glossarySnap.exists ? 1 : 0, "doc:settings/glossary");
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
  await fsOp(() => firestore().collection(collection).doc(id).set(toRemote(omitUndefined(value)) as DocumentData));
  trackFirestoreWrite(1, `upsert:${collection}`);
}

export async function saveFabric(fabric: Fabric) {
  const { persisted: _persisted, ...stored } = fabric;
  const next = { ...stored, templateIds: fabricTemplateIds(stored) };
  forgetArtTakenCache(next.id);
  if (firebaseAdminConfigured()) return upsert("fabrics", next.id, next);
  await mutate((db) => {
    const index = db.fabrics.findIndex((item) => item.id === next.id);
    if (index >= 0) db.fabrics[index] = next;
    else db.fabrics.push(next);
  });
}

export async function deleteFabric(id: string) {
  if (firebaseAdminConfigured()) {
    await fsOp(() => firestore().collection("fabrics").doc(id).delete());
    trackFirestoreDelete(1, "delete:fabrics");
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
    await fsOp(() => firestore().collection("catalogs").doc(slug).delete());
    trackFirestoreDelete(1, "delete:catalogs");
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
    await fsOp(() => firestore().collection("collections").doc(id).delete());
    trackFirestoreDelete(1, "delete:collections");
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
    await fsOp(() => firestore().collection("finishes").doc(id).delete());
    trackFirestoreDelete(1, "delete:finishes");
    return;
  }
  await mutate((db) => {
    db.finishes = rows;
  });
}

export async function deleteFabricType(id: string) {
  if (firebaseAdminConfigured()) {
    await fsOp(() => firestore().collection("fabricTypes").doc(id).delete());
    trackFirestoreDelete(1, "delete:fabricTypes");
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
    await fsOp(() => firestore().collection("productTypes").doc(id).delete());
    trackFirestoreDelete(1, "delete:productTypes");
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
    await fsOp(() => firestore().collection("templates").doc(id).delete());
    trackFirestoreDelete(1, "delete:templates");
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
  await recordCatalogDayStats(items);
}

export async function saveGlossary(terms: GlossaryTerm[]) {
  if (firebaseAdminConfigured()) {
    await fsOp(() => firestore().doc("settings/glossary").set({ terms: toRemote(terms) as DocumentData[] }));
    trackFirestoreWrite(1, "doc:settings/glossary");
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
    await fsOp(() => firestore().collection("users").doc(id).delete());
    trackFirestoreDelete(1, "delete:users");
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
