"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_GRID_CLASS, AdminMarketplaceCard } from "@/components/admin/AdminMarketplaceCard";
import { useI18n } from "@/components/i18n/I18n";
import { Badge } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteCatalogAction } from "@/lib/actions";
import { canEditCatalogs } from "@/lib/roles";
import type { Catalog, Fabric, Role } from "@/types";

function cardBtnClass(extra?: string) {
  return `inline-flex h-7 items-center rounded border border-black/10 bg-white px-2 text-[0.6875rem] hover:bg-black/[0.03] ${extra ?? ""}`;
}

export function CatalogList({ catalogs, fabrics, role }: { catalogs: Catalog[]; fabrics: Fabric[]; role: Role }) {
  const { t } = useI18n();
  const router = useRouter();

  function catalogUrl(slug: string) {
    if (typeof window === "undefined") return `/c/${slug}`;
    return `${window.location.origin}/c/${slug}`;
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(catalogUrl(slug));
    toast(t("catalogs.copied"));
  }

  async function remove(slug: string, title: string) {
    if (!window.confirm(t("catalogs.deleteConfirm", { name: title }))) return;
    await deleteCatalogAction(slug);
    toast(t("catalogs.deleted"));
    router.refresh();
  }

  return (
    <div className="max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl">{t("nav.catalogs")}</h1>
        {canEditCatalogs(role) ? (
          <Button type="button" size="sm" asChild>
            <Link href="/admin/catalogs/new">{t("catalogs.create")}</Link>
          </Button>
        ) : null}
      </div>
      {!catalogs.length ? <p className="mt-6 text-sm text-ink/60">{t("catalogs.emptyList")}</p> : null}
      <ul className={ADMIN_GRID_CLASS}>
        {catalogs.map((catalog) => {
          const count = catalog.fabricIds?.length ?? 0;
          const coverFabric = fabrics.find((item) => item.id === catalog.fabricIds?.[0]);
          const image = coverFabric?.design.thumbUrl || coverFabric?.mockups[0]?.thumbUrl;
          const title = catalog.title.ru || catalog.slug;
          return (
            <li key={catalog.slug}>
              <AdminMarketplaceCard
                image={image}
                placeholder={t("catalogs.noCover")}
                title={title}
                meta={`${catalog.status === "live" ? t("common.published") : t("common.draft")} · ${t("home.designs", { count })}`}
                badges={<span className="rounded-full bg-sand px-1.5 py-0.5 text-[0.625rem] uppercase text-ink/60">{catalog.layout.theme}</span>}
                actions={
                  <>
                    {canEditCatalogs(role) ? (
                      <Link href={`/admin/catalogs/${catalog.slug}`} className={cardBtnClass()}>
                        {t("catalogs.edit")}
                      </Link>
                    ) : null}
                    <a href={`/c/${catalog.slug}`} target="_blank" rel="noreferrer" className={cardBtnClass()}>
                      {t("catalogs.view")}
                    </a>
                    <button type="button" className={cardBtnClass()} onClick={() => void copyLink(catalog.slug)}>
                      {t("catalogs.copy")}
                    </button>
                    {canEditCatalogs(role) ? (
                      <button type="button" className={cardBtnClass("text-red-900 border-red-200")} onClick={() => void remove(catalog.slug, title)}>
                        {t("common.delete")}
                      </button>
                    ) : null}
                  </>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
