import { getDb, saveLead } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { notifyLead } from "@/lib/telegram";
import type { Lang } from "@/types";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`lead:${ip}`)) return Response.json({ error: "rate" }, { status: 429 });
  const body = (await request.json()) as { catalogSlug?: string; name?: string; contact?: string; message?: string; lang?: Lang; fabricIds?: string[] };
  const name = body.name?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  if (!body.catalogSlug || name.length < 2 || name.length > 120 || contact.length < 3 || contact.length > 160) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const db = await getDb();
  const catalog = db.catalogs.find((item) => item.slug === body.catalogSlug && item.status === "live");
  if (!catalog) return Response.json({ error: "missing" }, { status: 404 });
  const fabrics = db.fabrics.filter((fabric) => body.fabricIds?.includes(fabric.id));
  const lead = {
    id: crypto.randomUUID(),
    catalogSlug: catalog.slug,
    fabricId: fabrics[0]?.id,
    fabricIds: fabrics.map((fabric) => fabric.id),
    name,
    contact,
    message: body.message?.slice(0, 2000),
    lang: body.lang ?? catalog.defaultLang,
    createdAt: new Date().toISOString(),
    status: "new" as const,
  };
  await saveLead(lead);
  const lines = [
    "Заявка BAHMAL",
    `Каталог: ${catalog.title.ru}`,
    fabrics.length ? `Дизайны: ${fabrics.map((fabric) => `${fabric.art} ${fabric.name.ru}`).join(", ")}` : "Дизайны: не выбраны",
    `Имя: ${name}`,
    `Контакт: ${contact}`,
    `Язык: ${lead.lang}`,
    lead.message ? `Комментарий: ${lead.message}` : "",
  ].filter(Boolean);
  const telegram = await notifyLead(lines.join("\n"));
  return Response.json({ ok: true, telegram: telegram.sent ? "sent" : "skipped" });
}
