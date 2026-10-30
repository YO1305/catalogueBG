"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { FabricKindTabs } from "@/components/admin/FabricKindTabs";
import { ADMIN_GRID_CLASS, AdminFilterBar, AdminMarketplaceCard, AdminPageHeader, cardActionClass, cardIconActionClass } from "@/components/admin/AdminMarketplaceCard";
import { useI18n } from "@/components/i18n/I18n";
import { Badge, SearchInput, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteFabricAction } from "@/lib/actions";
import { isQuotaFail, runAdminAction } from "@/lib/runAdminAction";
import { FABRIC_KINDS, fabricKind } from "@/lib/fabricKind";
import { filterFabrics } from "@/lib/filterFabrics";
import { statusKey } from "@/lib/i18n";
import type { Catalog, Collection, Fabric, FabricKind, FabricType, ProductType, Role } from "@/types";

export function FabricBoard({
  kind,
  role,
  fabrics,
  collections,
  fabricTypes,
  productTypes: _productTypes,
  catalogs: _catalogs,
  cursor = null,
  nextCursor = null,
  hasMore = false,
}: {
  kind: FabricKind;
  role: Role;
  fabrics: Fabric[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  catalogs: Catalog[];
  cursor?: string | null;
  nextCursor?: string | null;
  hasMore?: boolean;
}) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [fabricTypeId, setFabricTypeId] = useState("");

  const inKind = useMemo(() => fabrics.filter((fabric) => fabricKind(fabric) === kind), [fabrics, kind]);
  const counts = useMemo(
    () => Object.fromEntries(FABRIC_KINDS.map((item) => [item, fabrics.filter((fabric) => fabricKind(fabric) === item).length])) as Record<FabricKind, number>,
    [fabrics],
  );
  const rows = useMemo(() => filterFabrics(inKind, { search, collectionId, fabricTypeId }), [inKind, search, collectionId, fabricTypeId]);
  const canWrite = role === "admin" || role === "designer";

  async function remove(fabric: Fabric) {
    if (!window.confirm(t("designs.deleteConfirm", { name: fabric.name.ru || fabric.art }))) return;
    const result = await runAdminAction(t, () => deleteFabricAction(fabric.id));
    if (!result || isQuotaFail(result) || !result.ok) return;
    toast(t("designs.deleted"));
    router.refresh();
  }

  return (
    <div className="max-w-[1600px]">
      <AdminPageHeader
        title={t("nav.designs")}
        action={
          canWrite ? (
            <Button type="button" asChild>
              <Link href={`/admin/fabrics/new?kind=${kind}`}>{t(`designs.create.${kind}`)}</Link>
            </Button>
          ) : null
        }
      />
      <FabricKindTabs value={kind} counts={counts} />
      <div className="mb-4 flex items-center justify-end gap-2 text-sm">
        {cursor ? (
          <Link href={`/admin/fabrics?kind=${kind}`} className="underline">
            {t("common.back")}
          </Link>
        ) : null}
        {hasMore && nextCursor ? (
          <Link href={`/admin/fabrics?kind=${kind}&cursor=${encodeURIComponent(nextCursor)}`} className="underline">
            {t("common.next")}
          </Link>
        ) : null}
      </div>
      <p className="mb-4 max-w-2xl text-sm text-ink/60">{t(`designs.kindHint.${kind}`)}</p>
      <AdminFilterBar>
        <SearchInput className="min-w-0 sm:min-w-[14rem] sm:flex-1" placeholder={t("designs.searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select className="sm:w-52" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
          <option value="">{t("designs.allCategories")}</option>
          {collections.filter((item) => item.active).map((item) => (
            <option key={item.id} value={item.id}>{item.name[lang]}</option>
          ))}
        </Select>
        <Select className="sm:w-52" value={fabricTypeId} onChange={(event) => setFabricTypeId(event.target.value)}>
          <option value="">{t("admin.fabricType")}</option>
          {fabricTypes.filter((item) => item.active).map((item) => (
            <option key={item.id} value={item.id}>{item.name[lang]}</option>
          ))}
        </Select>
      </AdminFilterBar>
      {!rows.length ? <p className="mt-6 text-sm text-ink/55">{t("designs.emptyList")}</p> : null}
      <ul className={ADMIN_GRID_CLASS}>
        {rows.map((fabric) => {
          const image = fabric.design.thumbUrl || fabric.mockups[0]?.thumbUrl;
          const collection = collections.find((item) => item.id === fabric.collectionId);
          const type = fabricTypes.find((item) => item.id === fabric.fabricTypeId);
          const title = fabric.name[lang] || fabric.name.ru || t("common.draft");
          const meta = [fabric.art, collection?.name[lang], type?.name[lang]].filter(Boolean).join(" · ");
          return (
            <li key={fabric.id}>
              <AdminMarketplaceCard
                image={image}
                placeholder={t("designs.noImage")}
                title={title}
                meta={meta}
                badges={
                  <>
                    <Badge tone={fabric.status === "published" ? "ok" : "default"}>{t(statusKey(fabric.status))}</Badge>
                    {fabric.mockups.length ? <Badge tone="gold">{String(fabric.mockups.length)}</Badge> : null}
                  </>
                }
                actions={
                  canWrite ? (
                    <>
                      <Link href={`/admin/fabrics/${fabric.id}`} className={cardActionClass("primary")}>{t("catalogs.edit")}</Link>
                      <button type="button" className={cardIconActionClass("danger")} aria-label={t("common.delete")} title={t("common.delete")} onClick={() => void remove(fabric)}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  ) : null
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
