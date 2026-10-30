import "server-only";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { FirestoreQuotaError, isFirestoreQuotaError, withFirestoreGuard } from "@/lib/firestoreGuard";

const FLUSH_MS = 5 * 60 * 1000;

export type SourceUsageRow = { reads: number; writes: number; deletes: number };

export type FirestoreUsageDayDoc = {
  reads: number;
  writes: number;
  deletes: number;
  sources: Record<string, SourceUsageRow>;
  hourly: Record<string, SourceUsageRow>;
  updatedAt?: string;
};

type PendingDelta = {
  reads: number;
  writes: number;
  deletes: number;
  bySource: Map<string, SourceUsageRow>;
};

let pending: PendingDelta = { reads: 0, writes: 0, deletes: 0, bySource: new Map() };
/** Start the clock on boot so the first admin write is not blocked by a usage transaction. */
let lastFlushAt = Date.now();
let flushInFlight: Promise<void> | null = null;

export function pacificDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function pacificHourKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}`;
}

function mergeSourceRow(target: SourceUsageRow, delta: SourceUsageRow) {
  target.reads += delta.reads;
  target.writes += delta.writes;
  target.deletes += delta.deletes;
}

function mergeSourceMap(target: Record<string, SourceUsageRow>, from: Map<string, SourceUsageRow>) {
  for (const [key, delta] of from) {
    const row = target[key] ?? { reads: 0, writes: 0, deletes: 0 };
    mergeSourceRow(row, delta);
    target[key] = row;
  }
}

export function enqueueUsageDelta(input: { reads: number; writes: number; deletes: number; source: string }) {
  pending.reads += input.reads;
  pending.writes += input.writes;
  pending.deletes += input.deletes;
  const row = pending.bySource.get(input.source) ?? { reads: 0, writes: 0, deletes: 0 };
  row.reads += input.reads;
  row.writes += input.writes;
  row.deletes += input.deletes;
  pending.bySource.set(input.source, row);
}

function usageDocId(dayKey: string) {
  return `usage-${dayKey}`;
}

function firestoreOrNull() {
  if (!firebaseAdminConfigured()) return null;
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

export async function maybeFlushUsageToFirestore(force = false) {
  if (process.env.NODE_ENV !== "production") return;
  const now = Date.now();
  if (!force && now - lastFlushAt < FLUSH_MS) return;
  if (pending.reads === 0 && pending.writes === 0 && pending.deletes === 0) return;
  if (flushInFlight) return flushInFlight;

  const batch = pending;
  pending = { reads: 0, writes: 0, deletes: 0, bySource: new Map() };
  lastFlushAt = now;

  flushInFlight = (async () => {
    const db = firestoreOrNull();
    if (!db) return;
    const dayKey = pacificDayKey();
    const hourKey = pacificHourKey();
    const ref = db.collection("meta").doc(usageDocId(dayKey));
    try {
      await withFirestoreGuard(() =>
        db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const current = snap.exists ? (snap.data() as FirestoreUsageDayDoc) : undefined;
          const sources: Record<string, SourceUsageRow> = { ...(current?.sources ?? {}) };
          const hourly: Record<string, SourceUsageRow> = { ...(current?.hourly ?? {}) };
          mergeSourceMap(sources, batch.bySource);
          const hourRow = hourly[hourKey] ?? { reads: 0, writes: 0, deletes: 0 };
          hourRow.reads += batch.reads;
          hourRow.writes += batch.writes;
          hourRow.deletes += batch.deletes;
          hourly[hourKey] = hourRow;
          tx.set(
            ref,
            {
              reads: FieldValue.increment(batch.reads),
              writes: FieldValue.increment(batch.writes),
              deletes: FieldValue.increment(batch.deletes),
              sources,
              hourly,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }),
      );
    } catch (error) {
      if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) {
        console.error("firestore usage flush quota");
        return;
      }
      console.error("firestore usage flush", error);
      pending.reads += batch.reads;
      pending.writes += batch.writes;
      pending.deletes += batch.deletes;
      for (const [key, delta] of batch.bySource) {
        const row = pending.bySource.get(key) ?? { reads: 0, writes: 0, deletes: 0 };
        mergeSourceRow(row, delta);
        pending.bySource.set(key, row);
      }
    } finally {
      flushInFlight = null;
    }
  })();

  return flushInFlight;
}

export async function getFirestoreUsageDay(dayKey = pacificDayKey()): Promise<FirestoreUsageDayDoc | null> {
  const db = firestoreOrNull();
  if (!db) return null;
  try {
    const snap = await withFirestoreGuard(() => db.collection("meta").doc(usageDocId(dayKey)).get());
    if (!snap.exists) return null;
    const data = snap.data() as FirestoreUsageDayDoc;
    return {
      reads: data.reads ?? 0,
      writes: data.writes ?? 0,
      deletes: data.deletes ?? 0,
      sources: data.sources ?? {},
      hourly: data.hourly ?? {},
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) throw error;
    console.error("getFirestoreUsageDay", error);
    return null;
  }
}

export function topSourcesFromDoc(doc: FirestoreUsageDayDoc | null, limit: number) {
  if (!doc?.sources) return [];
  return Object.entries(doc.sources)
    .map(([name, counts]) => ({
      name,
      total: counts.reads + counts.writes + counts.deletes,
      ...counts,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function hourlySeries(doc: FirestoreUsageDayDoc | null) {
  if (!doc?.hourly) return [];
  return Object.entries(doc.hourly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, counts]) => ({
      hour,
      reads: counts.reads,
      writes: counts.writes,
      deletes: counts.deletes,
    }));
}
