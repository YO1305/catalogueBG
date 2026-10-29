import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

type Bucket = { reads: number; writes: number; label?: string };

const store = new AsyncLocalStorage<Bucket>();

export function runWithFirestoreMetrics<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ reads: 0, writes: 0, label }, async () => {
    try {
      return await fn();
    } finally {
      logFirestoreMetrics(label);
    }
  });
}

export function trackFirestoreRead(count = 1) {
  const bucket = store.getStore();
  if (bucket) bucket.reads += count;
}

export function trackFirestoreWrite(count = 1) {
  const bucket = store.getStore();
  if (bucket) bucket.writes += count;
}

export function logFirestoreMetrics(fallbackLabel?: string) {
  if (process.env.NODE_ENV !== "development") return;
  const bucket = store.getStore();
  if (!bucket) return;
  const label = bucket.label ?? fallbackLabel ?? "request";
  if (bucket.reads === 0 && bucket.writes === 0) return;
  console.info(`[firestore] ${label}: reads=${bucket.reads} writes=${bucket.writes}`);
}

export function snapshotFirestoreMetrics() {
  const bucket = store.getStore();
  return bucket ? { reads: bucket.reads, writes: bucket.writes } : { reads: 0, writes: 0 };
}
