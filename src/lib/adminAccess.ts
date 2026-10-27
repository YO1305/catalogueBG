import type { AdminSection, AppUser, Role } from "@/types";
import type { Session } from "@/lib/session";

export const ADMIN_SECTIONS: AdminSection[] = [
  "catalogs",
  "fabrics",
  "templates",
  "leads",
  "stats",
  "settings",
  "usage",
  "access",
];

export function defaultSectionsForRole(role: Role): AdminSection[] {
  switch (role) {
    case "admin":
      return [...ADMIN_SECTIONS];
    case "designer":
      return ["catalogs", "fabrics", "templates", "stats", "settings"];
    case "manager":
      return ["catalogs", "leads", "stats", "settings"];
    default:
      return ["catalogs"];
  }
}

export function effectiveSections(user: Pick<AppUser, "role" | "sections">): AdminSection[] {
  if (user.role === "admin") return [...ADMIN_SECTIONS];
  const custom = user.sections?.filter((item) => ADMIN_SECTIONS.includes(item));
  if (custom?.length) return custom;
  return defaultSectionsForRole(user.role);
}

export function canAccessSection(session: Pick<Session, "role" | "sections">, section: AdminSection): boolean {
  const allowed = session.sections?.length ? session.sections : defaultSectionsForRole(session.role);
  if (session.role === "admin") return true;
  return allowed.includes(section);
}

const PATH_SECTION: Array<{ prefix: string; section: AdminSection }> = [
  { prefix: "/admin/catalogs", section: "catalogs" },
  { prefix: "/admin/fabrics", section: "fabrics" },
  { prefix: "/admin/templates", section: "templates" },
  { prefix: "/admin/leads", section: "leads" },
  { prefix: "/admin/stats", section: "stats" },
  { prefix: "/admin/settings", section: "settings" },
  { prefix: "/admin/users", section: "access" },
  { prefix: "/admin/lab", section: "access" },
];

export function sectionForAdminPath(pathname: string): AdminSection | null {
  if (pathname === "/admin" || pathname === "/admin/") return null;
  for (const row of PATH_SECTION) {
    if (pathname === row.prefix || pathname.startsWith(`${row.prefix}/`)) return row.section;
  }
  return null;
}

export function sectionLabelKey(section: AdminSection): string {
  return `access.section.${section}`;
}
