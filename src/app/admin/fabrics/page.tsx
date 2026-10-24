import { FabricBoard } from "@/components/admin/FabricBoard";
import { requireSession } from "@/lib/auth";
import { getFabricsBoardData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FabricsPage() {
  const [session, db] = await Promise.all([requireSession(), getFabricsBoardData()]);
  return (
    <FabricBoard
      role={session.role}
      fabrics={db.fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      catalogs={db.catalogs}
    />
  );
}
