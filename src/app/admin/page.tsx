import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireSession();
  const db = await getDb();
  const t = (key: string) => translate("ru", key);
  const cards = [
    [t("nav.fabrics"), db.fabrics.length, "/admin/fabrics"],
    [t("nav.catalogs"), db.catalogs.length, "/admin/catalogs"],
    [t("nav.leads"), db.leads.filter((lead) => lead.status === "new").length, "/admin/leads"],
    [t("nav.templates"), db.templates.length, "/admin/templates"],
  ];
  return (
    <main>
      <h1 className="font-display text-4xl">{t("admin.overview")}</h1>
      <p className="mt-2 text-sm text-ink/60">{session.name}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, count, href]) => (
          <Link key={String(href)} href={String(href)} className="bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
            <div className="font-display mt-2 text-4xl">{count}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
