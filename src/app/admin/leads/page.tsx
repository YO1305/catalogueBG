import { LeadsTable } from "@/components/admin/LeadsTable";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await requireSession(["admin", "manager"]);
  const db = await getDb();
  return <LeadsTable initial={db.leads} fabrics={db.fabrics} />;
}
