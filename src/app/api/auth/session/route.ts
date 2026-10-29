import { defaultSectionsForRole, effectiveSections } from "@/lib/adminAccess";
import { findStaffUser } from "@/lib/db";
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
    const staff = await findStaffUser(decoded.email ?? "");
    const claimRole = typeof decoded.role === "string" && ROLES.has(decoded.role as Role) ? (decoded.role as Role) : null;
    const staffRole = staff && ROLES.has(staff.role) ? staff.role : null;
    const role = claimRole ?? staffRole;
    if (!role) {
      return Response.json({ error: "role" }, { status: 403 });
    }
    const sections = staff ? effectiveSections(staff) : defaultSectionsForRole(role);
    const token = await signSession({
      uid: staff?.id ?? decoded.uid,
      email: decoded.email ?? staff?.email ?? "",
      name: staff?.name ?? decoded.name ?? decoded.email ?? "",
      role,
      sections,
    });
    const response = Response.json({ ok: true });
    response.headers.set("set-cookie", cookieHeader(SESSION_COOKIE, token));
    return response;
  } catch (error) {
    console.error("auth/session", error);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
