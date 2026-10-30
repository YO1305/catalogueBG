import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { FirestoreQuotaError, isFirestoreQuotaError, withFirestoreGuard } from "@/lib/firestoreGuard";
import {
  isWriteBrakeOn,
  pacificDayKey,
  pacificHourKey,
  shouldFlushTelemetry,
  takeTelemetryWriteSlot,
  tripWriteBrake,
  WRITE_BRAKE_LIMIT,
  writeBrakeActive,
} from "@/lib/telemetryBudget";
import { readJsonBlob, writeJsonBlob } from "@/lib/telemetryBlob";

export { pacificDayKey, pacificHourKey };

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
let lastFlushAt = Date.now();
let flushInFlight: Promise<void> | null = null;

function emptyRow(): SourceUsageRow {
  return { reads: 0, writes: 0, deletes: 0 };
}

function mergeSourceRow(target: SourceUsageRow, delta: SourceUsageRow) {
  target.reads += delta.reads;
  target.writes += delta.writes;
  target.deletes += delta.deletes;
}

function mergeSourceMap(target: Record<string, SourceUsageRow>, from: Map<string, SourceUsageRow> | Record<string, SourceUsageRow>) {
  const entries = from instanceof Map ? from.entries() : Object.entries(from);
  for (const [key, delta] of entries) {
    const row = target[key] ?? emptyRow();
    mergeSourceRow(row, delta);
    target[key] = row;
  }
}

function pendingTotal() {
  return pending.reads + pending.writes + pending.deletes;
}

export function enqueueUsageDelta(input: { reads: number; writes: number; deletes: number; source: string }) {
  pending.reads += input.reads;
  pending.writes += input.writes;
  pending.deletes += input.deletes;
  const row = pending.bySource.get(input.source) ?? emptyRow();
  mergeSourceRow(row, { reads: input.reads, writes: input.writes, deletes: input.deletes });
  pending.bySource.set(input.source, row);
  if (pending.writes >= WRITE_BRAKE_LIMIT) tripWriteBrake();
}

function blobPath(dayKey: string) {
  return `telemetry/usage-${dayKey}.json`;
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
  if (!force && !shouldFlushTelemetry(pendingTotal(), lastFlushAt, now)) return;
  if (force && pendingTotal() === 0) return;
  if (isWriteBrakeOn() || (await writeBrakeActive())) return;
  if (flushInFlight) return flushInFlight;
  if (!takeTelemetryWriteSlot()) return;

  const batch = pending;
  pending = { reads: 0, writes: 0, deletes: 0, bySource: new Map() };
  lastFlushAt = now;
  const dayKey = pacificDayKey();
  const hourKey = pacificHourKey();

  flushInFlight = (async () => {
    try {
      const current = (await readJsonBlob<FirestoreUsageDayDoc>(blobPath(dayKey))) ?? {
        reads: 0,
        writes: 0,
        deletes: 0,
        sources: {},
        hourly: {},
      };
      const sources = { ...current.sources };
      mergeSourceMap(sources, batch.bySource);
      const hourly = { ...current.hourly };
      const hourRow = hourly[hourKey] ?? emptyRow();
      hourRow.reads += batch.reads;
      hourRow.writes += batch.writes;
      hourRow.deletes += batch.deletes;
      hourly[hourKey] = hourRow;
      const next: FirestoreUsageDayDoc = {
        reads: current.reads + batch.reads,
        writes: current.writes + batch.writes,
        deletes: current.deletes + batch.deletes,
        sources,
        hourly,
        updatedAt: new Date().toISOString(),
      };
      if (next.writes >= WRITE_BRAKE_LIMIT) tripWriteBrake(dayKey);
      await writeJsonBlob(blobPath(dayKey), next);
      console.info(
        `[usage-blob] ${dayKey} r${next.reads} w${next.writes} d${next.deletes} +r${batch.reads}/+w${batch.writes}`,
      );
    } catch (error) {
      if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) {
        tripWriteBrake(dayKey);
        return;
      }
      console.error("usage blob flush", error);
      pending.reads += batch.reads;
      pending.writes += batch.writes;
      pending.deletes += batch.deletes;
      for (const [key, delta] of batch.bySource) {
        const row = pending.bySource.get(key) ?? emptyRow();
        mergeSourceRow(row, delta);
        pending.bySource.set(key, row);
      }
    } finally {
      flushInFlight = null;
    }
  })();

  return flushInFlight;
}

async function readLegacyUsageDoc(dayKey: string): Promise<FirestoreUsageDayDoc | null> {
  const db = firestoreOrNull();
  if (!db) return null;
  try {
    const snap = await withFirestoreGuard(() => db.collection("meta").doc(`usage-${dayKey}`).get());
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
    if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) {
      tripWriteBrake(dayKey);
      throw error;
    }
    console.error("getFirestoreUsageDay", error);
    return null;
  }
}

export async function getFirestoreUsageDay(dayKey = pacificDayKey()): Promise<FirestoreUsageDayDoc | null> {
  const fromBlob = await readJsonBlob<FirestoreUsageDayDoc>(blobPath(dayKey));
  if (fromBlob) return fromBlob;
  if (isWriteBrakeOn(dayKey) || (await writeBrakeActive())) return null;
  return readLegacyUsageDoc(dayKey);
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
