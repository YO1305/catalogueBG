import "server-only";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { withFirestoreGuard } from "@/lib/firestoreGuard";
import type { CatalogStats } from "@/lib/analytics";
import { trackFirestoreRead, trackFirestoreWrite } from "@/lib/firestoreMetrics";
import type { AnalyticsEvent } from "@/types";

const FLUSH_MS = 5 * 60 * 1000;
const RANGE_CAP = 62;

export type CatalogDayStat = {
  catalogSlug: string;
  day: string;
  open?: number;
  page?: number;
  zoom?: number;
  unique?: number;
  fabric_open?: number;
  fabrics?: Record<string, number>;
};

export function defaultStatsRange(from?: string, to?: string): { from: string; to: string } {
  const iso = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "");
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29);
  let a = iso(from) || start.toISOString().slice(0, 10);
  let b = iso(to) || today.toISOString().slice(0, 10);
  if (a > b) [a, b] = [b, a];
  return { from: a, to: b };
}

export function eachDayInclusive(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days;
  while (cursor <= end && days.length < RANGE_CAP) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function summarizeDayStats(days: CatalogDayStat[], leadCount: number): CatalogStats {
  let opens = 0;
  let unique = 0;
  let pages = 0;
  let zooms = 0;
  const byFabric = new Map<string, number>();
  for (const day of days) {
    opens += day.open ?? 0;
    unique += day.unique ?? 0;
    pages += day.page ?? 0;
    zooms += day.zoom ?? 0;
    for (const [id, count] of Object.entries(day.fabrics ?? {})) {
      byFabric.set(id, (byFabric.get(id) ?? 0) + count);
    }
  }
  const top = [...byFabric.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([fabricId, count]) => ({ fabricId, count }));
  return {
    opens,
    unique,
    avgPages: opens ? Math.round((pages / opens) * 10) / 10 : 0,
    zooms,
    leads: leadCount,
    conversion: unique ? Math.round((leadCount / unique) * 1000) / 10 : 0,
    top,
  };
}

export async function listCatalogDayStats(slug: string, from: string, to: string): Promise<CatalogDayStat[]> {
  if (!firebaseAdminConfigured()) return [];
  const app = getAdminApp();
  if (!app) return [];
  const db = getFirestore(app);
  const refs = eachDayInclusive(from, to).map((day) => db.collection("stats").doc(`${slug}_${day}`));
  if (!refs.length) return [];
  const chunks: Array<typeof refs> = [];
  for (let i = 0; i < refs.length; i += 100) chunks.push(refs.slice(i, i + 100));
  const snaps = (await Promise.all(chunks.map((chunk) => withFirestoreGuard(() => db.getAll(...chunk))))).flat();
  trackFirestoreRead(snaps.length, "stats:days");
  return snaps.flatMap((snap) => {
    if (!snap.exists) return [];
    const data = snap.data() as CatalogDayStat;
    const underscore = snap.id.lastIndexOf("_");
    return [
      {
        ...data,
        catalogSlug: data.catalogSlug ?? slug,
        day: data.day ?? snap.id.slice(underscore + 1),
      },
    ];
  });
}

type Pending = {
  counts: Partial<Record<AnalyticsEvent["type"], number>>;
  fabrics: Record<string, number>;
  sessions: Set<string>;
};

const pending = new Map<string, Pending>();
const lastFlushAt = new Map<string, number>();

function statsKey(slug: string, ts: string) {
  const day = ts.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `${slug}_${day}`;
}

function merge(items: AnalyticsEvent[]) {
  for (const item of items) {
    const key = statsKey(item.catalogSlug, item.ts);
    let row = pending.get(key);
    if (!row) {
      row = { counts: {}, fabrics: {}, sessions: new Set() };
      pending.set(key, row);
    }
    row.counts[item.type] = (row.counts[item.type] ?? 0) + 1;
    if (item.fabricId) row.fabrics[item.fabricId] = (row.fabrics[item.fabricId] ?? 0) + 1;
    if (item.type === "open") row.sessions.add(item.sessionId);
  }
}

async function writeKey(key: string) {
  const row = pending.get(key);
  if (!row) return;
  pending.delete(key);
  lastFlushAt.set(key, Date.now());
  if (!firebaseAdminConfigured()) return;
  const app = getAdminApp();
  if (!app) return;
  const underscore = key.lastIndexOf("_");
  const slug = key.slice(0, underscore);
  const day = key.slice(underscore + 1);
  const payload: Record<string, unknown> = {
    catalogSlug: slug,
    day,
    updatedAt: new Date().toISOString(),
  };
  if (row.sessions.size) payload.unique = FieldValue.increment(row.sessions.size);
  for (const [type, count] of Object.entries(row.counts)) {
    if (count) payload[type] = FieldValue.increment(count);
  }
  const fabrics: Record<string, ReturnType<typeof FieldValue.increment>> = {};
  for (const [id, count] of Object.entries(row.fabrics)) {
    if (count) fabrics[id] = FieldValue.increment(count);
  }
  if (Object.keys(fabrics).length) payload.fabrics = fabrics;
  await withFirestoreGuard(() => getFirestore(app).collection("stats").doc(key).set(payload, { merge: true }));
  trackFirestoreWrite(1, "stats:day");
}

export async function recordCatalogDayStats(items: AnalyticsEvent[]) {
  if (!items.length) return;
  merge(items);
  const now = Date.now();
  for (const key of [...pending.keys()]) {
    if (now - (lastFlushAt.get(key) ?? 0) < FLUSH_MS) continue;
    await writeKey(key);
  }
}
