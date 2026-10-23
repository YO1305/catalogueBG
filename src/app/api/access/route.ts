import { getDb } from "@/lib/db";
import { verifyPin } from "@/lib/password";
import { pinCookieName } from "@/lib/auth";
import { cookieHeader, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { slug?: string; pin?: string };
  const db = await getDb();
  const catalog = db.catalogs.find((item) => item.slug === body.slug);
  if (!catalog?.pinHash || !body.pin || !verifyPin(body.pin, catalog.pinHash)) return Response.json({ error: "pin" }, { status: 401 });
  const token = await signSession({ uid: `pin:${catalog.slug}`, email: catalog.slug, name: "pin", role: "manager", kind: "pin" }, 60 * 60 * 12);
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", cookieHeader(pinCookieName(catalog.slug), token, 60 * 60 * 12));
  return response;
}
