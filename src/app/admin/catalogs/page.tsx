import { CatalogList } from "@/components/admin/CatalogDesk";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  await requireSession(["admin", "manager"]);
  const db = await getDb();
  return <CatalogList catalogs={db.catalogs} />;
}
