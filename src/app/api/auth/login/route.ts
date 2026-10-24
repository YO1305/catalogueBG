import { findStaffUser } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, cookieHeader, signSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_AUTH === "0" && process.env.FIREBASE_PROJECT_ID) {
    return Response.json({ error: "firebase" }, { status: 400 });
  }
  const body = (await request.json()) as { email?: string; password?: string };
  const user = await findStaffUser(body.email ?? "");
  if (!user || !verifyPassword(body.password ?? "", user.passwordHash)) return Response.json({ error: "auth" }, { status: 401 });
  const token = await signSession({ uid: user.id, email: user.email, name: user.name, role: user.role });
  const response = Response.json({ ok: true, role: user.role });
  response.headers.set("set-cookie", cookieHeader(SESSION_COOKIE, token));
  return response;
}
