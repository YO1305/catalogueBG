import { LeadsTable } from "@/components/admin/LeadsTable";
import { requireSession } from "@/lib/auth";
import { getLeadsData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [, db] = await Promise.all([requireSession(["admin", "manager"]), getLeadsData()]);
  return <LeadsTable initial={db.leads} fabrics={db.fabrics} />;
}
