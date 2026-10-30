import { getSession } from "@/lib/auth";
import { canAccessSection } from "@/lib/adminAccess";
import { FIRESTORE_SPARK_READ_LIMIT, FIRESTORE_SPARK_WRITE_LIMIT, runWithFirestoreMeter } from "@/lib/firestore/meter";
import { FirestoreQuotaError, isFirestoreQuotaError } from "@/lib/firestoreGuard";
import { getFirestoreUsageDay, hourlySeries, pacificDayKey, topSourcesFromDoc } from "@/lib/firestore/usageDay";
import { firebaseAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  return runWithFirestoreMeter("api/admin/firestore-usage", async () => {
    const session = await getSession();
    if (!session || !canAccessSection(session, "usage")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const dayKey = pacificDayKey();
    let doc = null;
    let quotaHit = false;
    try {
      doc = await getFirestoreUsageDay(dayKey);
    } catch (error) {
      quotaHit = error instanceof FirestoreQuotaError || isFirestoreQuotaError(error);
      if (!quotaHit) throw error;
    }
    const usage = doc ?? { reads: 0, writes: 0, deletes: 0, sources: {}, hourly: {} };
    const exhausted =
      quotaHit || usage.reads >= FIRESTORE_SPARK_READ_LIMIT || usage.writes >= FIRESTORE_SPARK_WRITE_LIMIT;
    return Response.json({
      configured: firebaseAdminConfigured(),
      dayKey,
      exhausted,
      limits: { reads: FIRESTORE_SPARK_READ_LIMIT, writes: FIRESTORE_SPARK_WRITE_LIMIT },
      usage,
      topSources: topSourcesFromDoc(doc, 10),
      hourly: hourlySeries(doc),
    });
  });
}
