import type { AnalyticsEvent, Lead } from "@/types";

export type CatalogStats = {
  opens: number;
  unique: number;
  avgPages: number;
  zooms: number;
  leads: number;
  conversion: number;
  top: Array<{ fabricId: string; count: number }>;
};

export function summarizeCatalog(slug: string, events: AnalyticsEvent[], leads: Lead[]): CatalogStats {
  const mine = events.filter((event) => event.catalogSlug === slug);
  const opens = mine.filter((event) => event.type === "open");
  const sessions = new Set(opens.map((event) => event.sessionId));
  const pagesBySession = new Map<string, number>();
  for (const event of mine.filter((item) => item.type === "page")) {
    pagesBySession.set(event.sessionId, (pagesBySession.get(event.sessionId) ?? 0) + 1);
  }
  const pageCounts = [...pagesBySession.values()];
  const avgPages = pageCounts.length ? pageCounts.reduce((sum, count) => sum + count, 0) / pageCounts.length : 0;
  const opensByFabric = new Map<string, number>();
  for (const event of mine.filter((item) => item.type === "fabric_open" && item.fabricId)) {
    const id = event.fabricId!;
    opensByFabric.set(id, (opensByFabric.get(id) ?? 0) + 1);
  }
  const top = [...opensByFabric.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([fabricId, count]) => ({ fabricId, count }));
  const leadCount = leads.filter((lead) => lead.catalogSlug === slug).length;
  const unique = sessions.size;
  return {
    opens: opens.length,
    unique,
    avgPages: Math.round(avgPages * 10) / 10,
    zooms: mine.filter((event) => event.type === "zoom").length,
    leads: leadCount,
    conversion: unique ? Math.round((leadCount / unique) * 1000) / 10 : 0,
    top,
  };
}
