"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ADMIN_GRID_CLASS, AdminFilterBar, AdminMarketplaceCard, AdminPageHeader, cardActionClass, cardIconActionClass } from "@/components/admin/AdminMarketplaceCard";
import { useI18n } from "@/components/i18n/I18n";
import { Badge, SearchInput, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteFabricAction } from "@/lib/actions";
import { filterFabrics } from "@/lib/filterFabrics";
import { statusKey } from "@/lib/i18n";
import type { Catalog, Collection, Fabric, FabricType, ProductType, Role } from "@/types";

export function FabricBoard({
  role,
  fabrics,
  collections,
  fabricTypes,
}: {
  role: Role;
  fabrics: Fabric[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  catalogs: Catalog[];
}) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [fabricTypeId, setFabricTypeId] = useState("");

  const rows = useMemo(() => filterFabrics(fabrics, { search, collectionId, fabricTypeId }), [fabrics, search, collectionId, fabricTypeId]);
  const canWrite = role === "admin" || role === "designer";

  async function remove(fabric: Fabric) {
    if (!window.confirm(t("designs.deleteConfirm", { name: fabric.name.ru || fabric.art }))) return;
    await deleteFabricAction(fabric.id);
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
              <Link href="/admin/fabrics/new">{t("designs.create")}</Link>
            </Button>
          ) : null
        }
      />
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
