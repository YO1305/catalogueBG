import { FabricBoard } from "@/components/admin/FabricBoard";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FabricsPage({ searchParams }: { searchParams: Promise<{ create?: string; edit?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const db = await getDb();
  const initialOpen = params.create !== undefined ? "new" : params.edit ?? null;
  return (
    <FabricBoard
      role={session.role}
      userId={session.uid}
      fabrics={db.fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      catalogs={db.catalogs}
      templates={db.templates}
      initialOpen={initialOpen}
    />
  );
}
