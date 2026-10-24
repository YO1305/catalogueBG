"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { I18nProvider, useI18n } from "@/components/i18n/I18n";
import { Toaster } from "sonner";
import type { Lang, Role } from "@/types";
import type { Session } from "@/lib/session";

const LINKS: Array<{ href: string; key: string; roles: Role[] }> = [
  { href: "/admin/catalogs", key: "nav.catalogs", roles: ["admin", "designer", "manager"] },
  { href: "/admin/fabrics", key: "nav.designs", roles: ["admin", "designer", "manager"] },
  { href: "/admin/templates", key: "nav.mockups", roles: ["admin", "designer"] },
];

export function AdminFrame({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");
  const path = usePathname();
  if (path === "/admin/login") return <I18nProvider lang={lang}>{children}</I18nProvider>;
  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <Shell session={session} lang={lang} setLang={setLang}>
        {children}
      </Shell>
      <Toaster />
    </I18nProvider>
  );
}

function Shell({ session, lang, setLang, children }: { session: Session | null; lang: Lang; setLang: (lang: Lang) => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const role = session?.role ?? "manager";
  return (
    <div className="min-h-screen bg-[#f6f3ee] md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-majolica text-paper md:min-h-screen">
        <Link href="/admin" className="block px-5 py-6 font-display text-2xl tracking-wide">
          {t("brand")}
        </Link>
        <nav className="flex gap-2 overflow-auto px-3 pb-4 md:block md:space-y-1">
          {LINKS.filter((link) => link.roles.includes(role)).map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-white/10 ${active ? "bg-white/15 font-medium" : ""}`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>
        <div className="flex gap-2 px-5 py-4 text-xs uppercase">
          {(["ru", "en", "uz"] as Lang[]).map((item) => (
            <button key={item} type="button" className={item === lang ? "text-gold" : ""} onClick={() => setLang(item)}>
              {item}
            </button>
          ))}
        </div>
        {session?.email ? (
          <p className="px-5 pb-2 text-xs text-paper/70">
            {session.name || session.email}
            <span className="block opacity-70">{session.role}</span>
          </p>
        ) : null}
        <button
          type="button"
          className="px-5 pb-6 text-sm underline"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
          }}
        >
          {t("nav.logout")}
        </button>
      </aside>
      <div className="min-w-0 px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
