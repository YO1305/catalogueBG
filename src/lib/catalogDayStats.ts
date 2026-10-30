import "server-only";
import type { CatalogStats } from "@/lib/analytics";
import { isWriteBrakeOn, shouldFlushTelemetry, takeTelemetryWriteSlot, writeBrakeActive } from "@/lib/telemetryBudget";
import { readJsonBlob, writeJsonBlob } from "@/lib/telemetryBlob";
import type { AnalyticsEvent } from "@/types";

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

type DayFile = Record<string, CatalogDayStat>;

type Pending = {
  counts: Partial<Record<AnalyticsEvent["type"], number>>;
  fabrics: Record<string, number>;
  sessions: Set<string>;
};

const pending = new Map<string, Pending>();
let lastFlushAt = Date.now();
let flushInFlight: Promise<void> | null = null;

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

function statsBlobPath(day: string) {
  return `telemetry/stats-${day}.json`;
}

function pendingEventCount() {
  let total = 0;
  for (const row of pending.values()) {
    for (const count of Object.values(row.counts)) total += count ?? 0;
  }
  return total;
}

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

function applyRow(target: CatalogDayStat, row: Pending): CatalogDayStat {
  const fabrics = { ...(target.fabrics ?? {}) };
  for (const [id, count] of Object.entries(row.fabrics)) {
    fabrics[id] = (fabrics[id] ?? 0) + count;
  }
  return {
    catalogSlug: target.catalogSlug,
    day: target.day,
    open: (target.open ?? 0) + (row.counts.open ?? 0),
    page: (target.page ?? 0) + (row.counts.page ?? 0),
    zoom: (target.zoom ?? 0) + (row.counts.zoom ?? 0),
    unique: (target.unique ?? 0) + row.sessions.size,
    fabric_open: (target.fabric_open ?? 0) + (row.counts.fabric_open ?? 0),
    fabrics,
  };
}

async function flushPendingToBlob() {
  if (flushInFlight) return flushInFlight;
  if (await writeBrakeActive()) {
    pending.clear();
    return;
  }
  if (!takeTelemetryWriteSlot()) return;
  const snapshot = new Map(pending);
  pending.clear();
  lastFlushAt = Date.now();
  const byDay = new Map<string, Map<string, Pending>>();
  for (const [key, row] of snapshot) {
    const underscore = key.lastIndexOf("_");
    const slug = key.slice(0, underscore);
    const day = key.slice(underscore + 1);
    const dayMap = byDay.get(day) ?? new Map();
    dayMap.set(slug, row);
    byDay.set(day, dayMap);
  }
  flushInFlight = (async () => {
    try {
      for (const [day, rows] of byDay) {
        const file = (await readJsonBlob<DayFile>(statsBlobPath(day))) ?? {};
        for (const [slug, row] of rows) {
          const current = file[slug] ?? { catalogSlug: slug, day };
          file[slug] = applyRow(current, row);
        }
        await writeJsonBlob(statsBlobPath(day), file);
      }
      console.info(`[stats-blob] flushed ${snapshot.size} catalog-days`);
    } catch (error) {
      console.error("stats blob flush", error);
      for (const [key, row] of snapshot) pending.set(key, row);
    } finally {
      flushInFlight = null;
    }
  })();
  return flushInFlight;
}

export async function listCatalogDayStats(slug: string, from: string, to: string): Promise<CatalogDayStat[]> {
  const days = eachDayInclusive(from, to);
  const files = await Promise.all(days.map((day) => readJsonBlob<DayFile>(statsBlobPath(day))));
  return files.flatMap((file, index) => {
    const row = file?.[slug];
    if (!row) return [];
    const day = days[index] ?? row.day;
    return [{ ...row, catalogSlug: slug, day }];
  });
}

export async function recordCatalogDayStats(items: AnalyticsEvent[]) {
  if (!items.length || isWriteBrakeOn()) return;
  merge(items);
  if (!shouldFlushTelemetry(pendingEventCount(), lastFlushAt)) return;
  await flushPendingToBlob();
}
