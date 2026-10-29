import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { enqueueUsageDelta, maybeFlushUsageToFirestore } from "@/lib/firestore/usageDay";

export const FIRESTORE_SPARK_READ_LIMIT = 50_000;
export const FIRESTORE_SPARK_WRITE_LIMIT = 20_000;

type SourceCounts = { reads: number; writes: number; deletes: number };

type Bucket = {
  scope: string;
  reads: number;
  writes: number;
  deletes: number;
  bySource: Map<string, SourceCounts>;
};

const store = new AsyncLocalStorage<Bucket>();

function emptyCounts(): SourceCounts {
  return { reads: 0, writes: 0, deletes: 0 };
}

function addSource(map: Map<string, SourceCounts>, source: string, delta: Partial<SourceCounts>) {
  const row = map.get(source) ?? emptyCounts();
  if (delta.reads) row.reads += delta.reads;
  if (delta.writes) row.writes += delta.writes;
  if (delta.deletes) row.deletes += delta.deletes;
  map.set(source, row);
}

function scopedSource(scope: string | undefined, source: string): string {
  if (!scope) return source;
  return `${scope}::${source}`;
}

function record(source: string, delta: Partial<SourceCounts>) {
  const bucket = store.getStore();
  const reads = delta.reads ?? 0;
  const writes = delta.writes ?? 0;
  const deletes = delta.deletes ?? 0;
  if (reads === 0 && writes === 0 && deletes === 0) return;

  const fullSource = scopedSource(bucket?.scope, source);
  if (bucket) {
    bucket.reads += reads;
    bucket.writes += writes;
    bucket.deletes += deletes;
    addSource(bucket.bySource, fullSource, delta);
  }

  if (process.env.NODE_ENV === "production") {
    enqueueUsageDelta({ reads, writes, deletes, source: fullSource });
    // Fire-and-forget: do not block save/publish on usage flush.
    void maybeFlushUsageToFirestore();
  }
}

export function trackFirestoreRead(count = 1, source = "db:unknown") {
  if (count <= 0) return;
  record(source, { reads: count });
}

export function trackFirestoreWrite(count = 1, source = "db:unknown") {
  if (count <= 0) return;
  record(source, { writes: count });
}

export function trackFirestoreDelete(count = 1, source = "db:unknown") {
  if (count <= 0) return;
  record(source, { deletes: count });
}

function topSources(map: Map<string, SourceCounts>, limit: number) {
  return [...map.entries()]
    .map(([name, counts]) => ({
      name,
      total: counts.reads + counts.writes + counts.deletes,
      ...counts,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function logDevBucket(scope: string, bucket: Bucket) {
  if (process.env.NODE_ENV !== "development") return;
  if (bucket.reads === 0 && bucket.writes === 0 && bucket.deletes === 0) return;
  const top = topSources(bucket.bySource, 5);
  const topLine = top.map((row) => `${row.name}(${row.reads}r/${row.writes}w/${row.deletes}d)`).join(", ");
  console.info(
    `[firestore] ${scope}: reads=${bucket.reads} writes=${bucket.writes} deletes=${bucket.deletes}${topLine ? ` | top: ${topLine}` : ""}`,
  );
}

export function runWithFirestoreMeter<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ scope, reads: 0, writes: 0, deletes: 0, bySource: new Map() }, async () => {
    try {
      return await fn();
    } finally {
      const bucket = store.getStore();
      if (bucket) logDevBucket(scope, bucket);
    }
  });
}

/** @deprecated use runWithFirestoreMeter */
export const runWithFirestoreMetrics = runWithFirestoreMeter;

export function snapshotFirestoreMetrics() {
  const bucket = store.getStore();
  return bucket
    ? { reads: bucket.reads, writes: bucket.writes, deletes: bucket.deletes }
    : { reads: 0, writes: 0, deletes: 0 };
}

export function logFirestoreMetrics(fallbackLabel?: string) {
  const bucket = store.getStore();
  if (!bucket) return;
  logDevBucket(bucket.scope ?? fallbackLabel ?? "request", bucket);
}
