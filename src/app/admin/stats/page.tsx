import { StatsScreen } from "@/components/admin/StatsScreen";
import { requireSession } from "@/lib/auth";
import { getStatsData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [, db] = await Promise.all([requireSession(["admin", "manager", "designer"]), getStatsData()]);
  return <StatsScreen catalogs={db.catalogs} events={db.events} leads={db.leads} fabrics={db.fabrics} />;
}
