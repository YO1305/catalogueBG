import { CatalogList } from "@/components/admin/CatalogDesk";
import { requireSession } from "@/lib/auth";
import { getCatalogListData } from "@/lib/db";
import { runWithFirestoreMetrics } from "@/lib/firestoreMetrics";

export const dynamic = "force-dynamic";

export default async function CatalogsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const query = await searchParams;
  const [session, data] = await Promise.all([
    requireSession(["admin", "manager", "designer"]),
    runWithFirestoreMetrics("admin:catalogs", () => getCatalogListData({ cursor: query.cursor ?? null })),
  ]);
  return (
    <CatalogList
      catalogs={data.catalogs}
      fabrics={data.fabrics}
      role={session.role}
      cursor={data.cursor}
      nextCursor={data.nextCursor}
      hasMore={data.hasMore}
    />
  );
}
