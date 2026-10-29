import { getSession } from "@/lib/auth";
import { canAccessSection } from "@/lib/adminAccess";
import { FIRESTORE_SPARK_READ_LIMIT, FIRESTORE_SPARK_WRITE_LIMIT, runWithFirestoreMeter } from "@/lib/firestore/meter";
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
    const doc = await getFirestoreUsageDay(dayKey);
    return Response.json({
      configured: firebaseAdminConfigured(),
      dayKey,
      limits: { reads: FIRESTORE_SPARK_READ_LIMIT, writes: FIRESTORE_SPARK_WRITE_LIMIT },
      usage: doc ?? { reads: 0, writes: 0, deletes: 0, sources: {}, hourly: {} },
      topSources: topSourcesFromDoc(doc, 10),
      hourly: hourlySeries(doc),
    });
  });
}
