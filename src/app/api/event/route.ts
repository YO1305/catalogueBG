import { saveEvents } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import type { AnalyticsEvent } from "@/types";

const TYPES = new Set(["open", "page", "fabric_open", "zoom", "share", "pdf", "lead"]);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`event:${ip}`, 60)) return Response.json({ ok: true });
  const body = (await request.json()) as { events?: Array<Partial<AnalyticsEvent>> };
  const events: AnalyticsEvent[] = (body.events ?? []).slice(0, 20).flatMap((event) => {
    if (!event.catalogSlug || !event.sessionId || !event.type || !TYPES.has(event.type)) return [];
    return [{
      id: crypto.randomUUID(),
      catalogSlug: String(event.catalogSlug).slice(0, 80),
      type: event.type,
      fabricId: event.fabricId ? String(event.fabricId).slice(0, 80) : undefined,
      page: typeof event.page === "number" ? event.page : undefined,
      ts: new Date().toISOString(),
      sessionId: String(event.sessionId).slice(0, 80),
    }];
  });
  if (events.length) await saveEvents(events);
  return Response.json({ ok: true });
}
