import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { suspectTerms } from "@/lib/glossary";
import { canEditCatalogs, canEditDictionaries, canEditFabrics } from "@/lib/roles";
import { translateFields } from "@/lib/translate";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || canEditCatalogs(session.role) || canEditDictionaries(session.role))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as { fields?: Record<string, string>; locked?: Record<string, boolean> };
  const fields = body.fields ?? {};
  const locked = body.locked ?? {};
  const open = Object.fromEntries(Object.entries(fields).filter(([key]) => !locked[key]));
  const db = await getDb();
  const translated = await translateFields(open, db.glossary);
  const suspects = suspectTerms(Object.values(fields).join(" "), db.glossary);
  return Response.json({ ...translated, suspects });
}
