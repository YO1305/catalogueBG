import "server-only";
import { list } from "@vercel/blob";
import { planLimits, resolveBillingPlan, usageLevel, type UsageLevel } from "@/lib/vercelPlanLimits";

export type UsageSnapshot = {
  plan: ReturnType<typeof resolveBillingPlan>;
  measuredAt: string;
  blob: {
    bytes: number;
    objects: number;
    source: "list" | "unavailable";
    noteKey?: string;
  };
  metrics: Array<{
    id: string;
    used: number;
    included: number;
    level: UsageLevel;
    measured: boolean;
  }>;
};

async function sumBlobBytes(): Promise<{ bytes: number; objects: number } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  let cursor: string | undefined;
  let bytes = 0;
  let objects = 0;
  for (let page = 0; page < 200; page += 1) {
    const batch = await list({ token, cursor, limit: 1000 });
    for (const blob of batch.blobs) {
      bytes += blob.size;
      objects += 1;
    }
    if (!batch.hasMore || !batch.cursor) break;
    cursor = batch.cursor;
  }
  return { bytes, objects };
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const plan = resolveBillingPlan();
  const limits = planLimits(plan);
  const listed = await sumBlobBytes();
  const gb = listed ? listed.bytes / (1024 ** 3) : 0;

  const metrics = limits.map((row) => {
    if (row.id === "blobStorageGb") {
      const used = listed ? gb : 0;
      return {
        id: row.id,
        used,
        included: row.included,
        level: usageLevel(used, row.included, row.warnRatio),
        measured: Boolean(listed),
      };
    }
    return {
      id: row.id,
      used: 0,
      included: row.included,
      level: "ok" as UsageLevel,
      measured: false,
    };
  });

  return {
    plan,
    measuredAt: new Date().toISOString(),
    blob: listed
      ? { bytes: listed.bytes, objects: listed.objects, source: "list" }
      : { bytes: 0, objects: 0, source: "unavailable", noteKey: "usage.blobTokenMissing" },
    metrics,
  };
}
