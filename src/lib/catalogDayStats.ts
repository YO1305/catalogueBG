import "server-only";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { trackFirestoreWrite } from "@/lib/firestoreMetrics";
import type { AnalyticsEvent } from "@/types";

const FLUSH_MS = 5 * 60 * 1000;

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
  await getFirestore(app).collection("stats").doc(key).set(payload, { merge: true });
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
