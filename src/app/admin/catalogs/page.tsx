import { CatalogList } from "@/components/admin/CatalogDesk";
import { requireSession } from "@/lib/auth";
import { getCatalogListData } from "@/lib/db";
import { runWithFirestoreMetrics } from "@/lib/firestoreMetrics";

export const dynamic = "force-dynamic";

export default async function CatalogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(0, Number(query.page ?? "1") - 1);
  const [session, data] = await Promise.all([
    requireSession(["admin", "manager", "designer"]),
    runWithFirestoreMetrics("admin:catalogs", () => getCatalogListData({ page })),
  ]);
  return (
    <CatalogList
      catalogs={data.catalogs}
      fabrics={data.fabrics}
      role={session.role}
      page={data.page + 1}
      hasMore={data.hasMore}
    />
  );
}
