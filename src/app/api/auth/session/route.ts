import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";
import { SESSION_COOKIE, cookieHeader, signSession } from "@/lib/session";
import type { Role } from "@/types";

export const runtime = "nodejs";

const ROLES = new Set<Role>(["admin", "designer", "manager"]);

export async function POST(request: Request) {
  try {
    const app = getAdminApp();
    if (!firebaseAdminConfigured() || !app) {
      return Response.json({ error: "firebase" }, { status: 400 });
    }
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken) {
      return Response.json({ error: "auth" }, { status: 401 });
    }
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth(app).verifyIdToken(body.idToken);
    const role = decoded.role;
    if (typeof role !== "string" || !ROLES.has(role as Role)) {
      return Response.json({ error: "role" }, { status: 403 });
    }
    const token = await signSession({
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name ?? decoded.email ?? "",
      role: role as Role,
    });
    const response = Response.json({ ok: true });
    response.headers.set("set-cookie", cookieHeader(SESSION_COOKIE, token));
    return response;
  } catch (error) {
    console.error("auth/session", error);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
