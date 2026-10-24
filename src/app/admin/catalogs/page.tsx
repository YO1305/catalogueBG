import { CatalogList } from "@/components/admin/CatalogDesk";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  const session = await requireSession(["admin", "manager", "designer"]);
  const db = await getDb();
  return <CatalogList catalogs={db.catalogs} fabrics={db.fabrics} role={session.role} />;
}
