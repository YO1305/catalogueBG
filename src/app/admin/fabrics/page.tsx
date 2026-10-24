import { FabricBoard } from "@/components/admin/FabricBoard";
import { requireSession } from "@/lib/auth";
import { getCatalogListData, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FabricsPage() {
  const session = await requireSession();
  const { fabrics } = await getCatalogListData();
  const db = await getDb();
  return (
    <FabricBoard
      role={session.role}
      fabrics={fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      catalogs={db.catalogs}
    />
  );
}
