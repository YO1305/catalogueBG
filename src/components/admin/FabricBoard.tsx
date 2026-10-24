"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_GRID_CLASS, AdminMarketplaceCard } from "@/components/admin/AdminMarketplaceCard";
import { useI18n } from "@/components/i18n/I18n";
import { Badge } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteFabricAction } from "@/lib/actions";
import { filterFabrics } from "@/lib/filterFabrics";
import { statusKey } from "@/lib/i18n";
import type { Catalog, Collection, Fabric, FabricType, ProductType, Role } from "@/types";

function cardBtnClass(extra?: string) {
  return `inline-flex h-7 items-center rounded border border-black/10 bg-white px-2 text-[0.6875rem] hover:bg-black/[0.03] ${extra ?? ""}`;
}

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl">{t("nav.designs")}</h1>
        {canWrite ? (
          <Button type="button" size="sm" asChild>
            <Link href="/admin/fabrics/new">{t("designs.create")}</Link>
          </Button>
        ) : null}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input className="h-9 min-w-[10rem] flex-1 rounded-md border border-black/10 bg-white px-2.5 text-sm" placeholder={t("designs.searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="h-9 rounded-md border border-black/10 bg-white px-2 text-sm" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
          <option value="">{t("designs.allCategories")}</option>
          {collections.filter((item) => item.active).map((item) => (
            <option key={item.id} value={item.id}>{item.name[lang]}</option>
          ))}
        </select>
        <select className="h-9 rounded-md border border-black/10 bg-white px-2 text-sm" value={fabricTypeId} onChange={(event) => setFabricTypeId(event.target.value)}>
          <option value="">{t("admin.fabricType")}</option>
          {fabricTypes.filter((item) => item.active).map((item) => (
            <option key={item.id} value={item.id}>{item.name[lang]}</option>
          ))}
        </select>
      </div>
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
                      <Link href={`/admin/fabrics/${fabric.id}`} className={cardBtnClass()}>{t("catalogs.edit")}</Link>
                      <button type="button" className={cardBtnClass("text-red-900 border-red-200")} onClick={() => void remove(fabric)}>{t("common.delete")}</button>
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
