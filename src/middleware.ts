import { canAccessSection, sectionForAdminPath } from "@/lib/adminAccess";
import { verifySession } from "@/lib/session";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) return NextResponse.next();
  const session = await verifySession(request.cookies.get("bahmal_session")?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin/lab") && session.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/users")) {
    const allowed =
      canAccessSection(session, "settings") ||
      canAccessSection(session, "access") ||
      canAccessSection(session, "usage");
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  } else {
    const section = sectionForAdminPath(pathname);
    if (section && !canAccessSection(session, section)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
