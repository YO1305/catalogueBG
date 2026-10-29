import { FabricBoard } from "@/components/admin/FabricBoard";
import { requireSession } from "@/lib/auth";
import { getFabricsBoardData } from "@/lib/db";
import { isFabricKind } from "@/lib/fabricKind";
import { runWithFirestoreMetrics } from "@/lib/firestoreMetrics";

export const dynamic = "force-dynamic";

export default async function FabricsPage({ searchParams }: { searchParams: Promise<{ kind?: string; page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(0, Number(query.page ?? "1") - 1);
  const [session, db] = await Promise.all([
    requireSession(),
    runWithFirestoreMetrics("admin:fabrics", () => getFabricsBoardData({ page })),
  ]);
  return (
    <FabricBoard
      kind={isFabricKind(query.kind) ? query.kind : "printed"}
      role={session.role}
      fabrics={db.fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      catalogs={db.catalogs}
      page={db.page + 1}
      hasMore={db.hasMore}
    />
  );
}
