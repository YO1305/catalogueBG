import { CatalogList } from "@/components/admin/CatalogDesk";
import { requireSession } from "@/lib/auth";
import { getCatalogListData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  const session = await requireSession(["admin", "manager", "designer"]);
  const { catalogs, fabrics } = await getCatalogListData();
  return <CatalogList catalogs={catalogs} fabrics={fabrics} role={session.role} />;
}
