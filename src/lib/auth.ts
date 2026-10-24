import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readToken, verifySession, type Session } from "@/lib/session";
import type { Role } from "@/types";

export async function getSession(): Promise<Session | null> {
  noStore();
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (roles && !roles.includes(session.role)) redirect("/admin");
  return session;
}

export function pinCookieName(slug: string) {
  return `bahmal_pin_${slug}`;
}

export async function hasPinAccess(slug: string) {
  const jar = await cookies();
  const token = await readToken(jar.get(pinCookieName(slug))?.value);
  return token?.kind === "pin" && token.email === slug;
}
