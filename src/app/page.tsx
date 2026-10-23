import Link from "next/link";
import { resolveFabrics } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const catalogs = db.catalogs.filter((catalog) => catalog.status === "live" && catalog.access === "public" && (!catalog.expiresAt || catalog.expiresAt > new Date().toISOString()));
  const t = (key: string, vars?: Record<string, string | number>) => translate("ru", key, vars);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-12">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">{t("home.kicker")}</p>
      <h1 className="font-display mt-3 text-5xl text-majolica">{t("home.title")}</h1>
      <p className="mt-4 max-w-xl text-ink/70">{t("home.lead")}</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {catalogs.map((catalog) => {
          const count = resolveFabrics(catalog, db.fabrics).length;
          const cover = db.fabrics.find((fabric) => fabric.id === catalog.cover.fabricId) ?? db.fabrics.find((fabric) => resolveFabrics(catalog, [fabric]).length);
          const image = catalog.cover.imageUrl || cover?.mockups[0]?.thumbUrl || cover?.design.thumbUrl;
          return (
            <Link key={catalog.slug} href={`/c/${catalog.slug}`} className="lift overflow-hidden bg-paper shadow-sm">
              <div className="aspect-[4/3] bg-majolica">
                {image ? <img src={image} alt={catalog.title.ru} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="p-4">
                <h2 className="font-display text-2xl">{catalog.title.ru}</h2>
                <p className="mt-1 text-sm text-ink/60">{t("home.designs", { count })}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {!catalogs.length ? <p className="mt-8">{t("home.empty")}</p> : null}
      <Link href="/admin/login" className="mt-10 inline-block text-sm underline">
        {t("home.admin")}
      </Link>
    </main>
  );
}
