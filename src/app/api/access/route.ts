import { pinCookieName } from "@/lib/auth";
import { getCatalog } from "@/lib/db";
import { verifyPin } from "@/lib/password";
import { pinClearCookie, pinLocked, pinTriesFromCookie, pinTryCookie, recordPinFailure } from "@/lib/pinGuard";
import { cookieHeader, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { slug?: string; pin?: string };
  const slug = String(body.slug ?? "").slice(0, 80);
  const pin = String(body.pin ?? "");
  if (!slug || !pin) return Response.json({ error: "pin" }, { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const tries = pinTriesFromCookie(request, slug);
  if (pinLocked(ip, slug, tries)) {
    const response = Response.json({ error: "rate" }, { status: 429 });
    response.headers.set("set-cookie", pinTryCookie(slug, Math.max(tries, 5)));
    return response;
  }
  const catalog = await getCatalog(slug);
  if (!catalog?.pinHash || !verifyPin(pin, catalog.pinHash)) {
    recordPinFailure(ip, slug);
    const response = Response.json({ error: "pin" }, { status: 401 });
    response.headers.set("set-cookie", pinTryCookie(slug, tries + 1));
    return response;
  }
  const token = await signSession({ uid: `pin:${catalog.slug}`, email: catalog.slug, name: "pin", role: "manager", kind: "pin" }, 60 * 60 * 12);
  const response = Response.json({ ok: true });
  response.headers.append("set-cookie", cookieHeader(pinCookieName(catalog.slug), token, 60 * 60 * 12));
  response.headers.append("set-cookie", pinClearCookie(slug));
  return response;
}
