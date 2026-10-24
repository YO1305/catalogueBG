import { CatalogList } from "@/components/admin/CatalogDesk";
import { requireSession } from "@/lib/auth";
import { getCatalogListData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  const [session, { catalogs, fabrics }] = await Promise.all([requireSession(["admin", "manager", "designer"]), getCatalogListData()]);
  return <CatalogList catalogs={catalogs} fabrics={fabrics} role={session.role} />;
}
