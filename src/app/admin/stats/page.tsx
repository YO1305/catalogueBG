import { StatsScreen } from "@/components/admin/StatsScreen";
import { requireSession } from "@/lib/auth";
import { getStatsData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ slug?: string; from?: string; to?: string }> }) {
  const query = await searchParams;
  const [, data] = await Promise.all([
    requireSession(["admin", "manager", "designer"]),
    getStatsData({ slug: query.slug, from: query.from, to: query.to }),
  ]);
  return (
    <StatsScreen catalogs={data.catalogs} selected={data.selected} summary={data.summary} fabrics={data.fabrics} from={data.from} to={data.to} />
  );
}
