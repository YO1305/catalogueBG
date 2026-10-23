import { StatsScreen } from "@/components/admin/StatsScreen";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  await requireSession(["admin", "manager", "designer"]);
  const db = await getDb();
  return <StatsScreen catalogs={db.catalogs} events={db.events} leads={db.leads} fabrics={db.fabrics} />;
}
