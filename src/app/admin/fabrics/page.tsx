import { FabricBoard } from "@/components/admin/FabricBoard";
import { requireSession } from "@/lib/auth";
import { getFabricsBoardData } from "@/lib/db";
import { isFabricKind } from "@/lib/fabricKind";
import { runWithFirestoreMetrics } from "@/lib/firestoreMetrics";

export const dynamic = "force-dynamic";

export default async function FabricsPage({ searchParams }: { searchParams: Promise<{ kind?: string; cursor?: string }> }) {
  const query = await searchParams;
  const [session, db] = await Promise.all([
    requireSession(),
    runWithFirestoreMetrics("admin:fabrics", () => getFabricsBoardData({ cursor: query.cursor ?? null })),
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
      cursor={db.cursor}
      nextCursor={db.nextCursor}
      hasMore={db.hasMore}
    />
  );
}
