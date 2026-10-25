import { FabricBoard } from "@/components/admin/FabricBoard";
import { requireSession } from "@/lib/auth";
import { getFabricsBoardData } from "@/lib/db";
import { isFabricKind } from "@/lib/fabricKind";

export const dynamic = "force-dynamic";

export default async function FabricsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const [session, db, query] = await Promise.all([requireSession(), getFabricsBoardData(), searchParams]);
  return (
    <FabricBoard
      kind={isFabricKind(query.kind) ? query.kind : "printed"}
      role={session.role}
      fabrics={db.fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      catalogs={db.catalogs}
    />
  );
}
