"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Trash2 } from "lucide-react";
import { ADMIN_GRID_CLASS, AdminMarketplaceCard, AdminPageHeader, cardActionClass, cardIconActionClass } from "@/components/admin/AdminMarketplaceCard";
import { useI18n } from "@/components/i18n/I18n";
import { Badge } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteCatalogAction } from "@/lib/actions";
import { isQuotaFail, runAdminAction } from "@/lib/runAdminAction";
import { canEditCatalogs } from "@/lib/roles";
import type { Catalog, Fabric, Role } from "@/types";

export function CatalogList({
  catalogs,
  fabrics,
  role,
  cursor = null,
  nextCursor = null,
  hasMore = false,
}: {
  catalogs: Catalog[];
  fabrics: Fabric[];
  role: Role;
  cursor?: string | null;
  nextCursor?: string | null;
  hasMore?: boolean;
}) {
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
    const result = await runAdminAction(t, () => deleteCatalogAction(slug));
    if (!result || isQuotaFail(result) || !result.ok) return;
    toast(t("catalogs.deleted"));
    router.refresh();
  }

  return (
    <div className="max-w-[1600px]">
      <AdminPageHeader
        title={t("nav.catalogs")}
        action={
          canEditCatalogs(role) ? (
            <Button type="button" asChild>
              <Link href="/admin/catalogs/new">{t("catalogs.create")}</Link>
            </Button>
          ) : null
        }
      />
      {!catalogs.length ? <p className="mt-6 text-sm text-ink/60">{t("catalogs.emptyList")}</p> : null}
      <div className="mb-4 flex items-center justify-end gap-2 text-sm">
        {cursor ? (
          <Link href="/admin/catalogs" className="underline">
            {t("common.back")}
          </Link>
        ) : null}
        {hasMore && nextCursor ? (
          <Link href={`/admin/catalogs?cursor=${encodeURIComponent(nextCursor)}`} className="underline">
            {t("common.next")}
          </Link>
        ) : null}
      </div>
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
                badges={<Badge>{catalog.layout.theme}</Badge>}
                actions={
                  <>
                    {canEditCatalogs(role) ? (
                      <>
                        <Link href={`/admin/catalogs/${catalog.slug}`} className={cardActionClass("primary")}>
                          {t("catalogs.edit")}
                        </Link>
                        <button type="button" className={cardIconActionClass("danger")} aria-label={t("common.delete")} title={t("common.delete")} onClick={() => void remove(catalog.slug, title)}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </>
                    ) : null}
                    <a href={`/c/${catalog.slug}`} target="_blank" rel="noreferrer" className={cardActionClass()}>
                      {t("catalogs.view")}
                    </a>
                    <button type="button" className={cardIconActionClass()} aria-label={t("catalogs.copy")} title={t("catalogs.copy")} onClick={() => void copyLink(catalog.slug)}>
                      <Link2 className="h-4 w-4" aria-hidden />
                    </button>
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
