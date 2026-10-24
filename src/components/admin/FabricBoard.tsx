"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FabricEditorDialog } from "@/components/admin/FabricEditorDialog";
import { useI18n } from "@/components/i18n/I18n";
import { Badge } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteFabricAction } from "@/lib/actions";
import { emptyFabric } from "@/lib/fabricDraft";
import { filterFabrics } from "@/lib/filterFabrics";
import { statusKey } from "@/lib/i18n";
import type { Catalog, Collection, Fabric, FabricType, ProductType, Role, Template } from "@/types";

export function FabricBoard({
  role,
  userId,
  fabrics,
  collections,
  fabricTypes,
  productTypes,
  catalogs,
  templates,
  initialOpen,
}: {
  role: Role;
  userId: string;
  fabrics: Fabric[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  catalogs: Catalog[];
  templates: Template[];
  initialOpen?: "new" | string | null;
}) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [fabricTypeId, setFabricTypeId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Fabric | null>(null);

  useEffect(() => {
    if (initialOpen === "new") {
      setEditing(emptyFabric(userId));
      setEditorOpen(true);
      router.replace("/admin/fabrics");
    } else if (initialOpen) {
      const fabric = fabrics.find((item) => item.id === initialOpen);
      if (fabric) {
        setEditing(fabric);
        setEditorOpen(true);
      }
      router.replace("/admin/fabrics");
    }
  }, [initialOpen, fabrics, userId, router]);

  const rows = useMemo(() => filterFabrics(fabrics, { search, collectionId, fabricTypeId }), [fabrics, search, collectionId, fabricTypeId]);
  const canWrite = role === "admin" || role === "designer";

  function openCreate() {
    setEditing(emptyFabric(userId));
    setEditorOpen(true);
  }

  function openEdit(fabric: Fabric) {
    setEditing(fabric);
    setEditorOpen(true);
  }

  async function remove(fabric: Fabric) {
    if (!window.confirm(t("designs.deleteConfirm", { name: fabric.name.ru || fabric.art }))) return;
    await deleteFabricAction(fabric.id);
    toast(t("designs.deleted"));
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{t("nav.designs")}</h1>
        {canWrite ? (
          <Button type="button" onClick={openCreate}>
            {t("designs.create")}
          </Button>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          className="h-11 min-w-[12rem] flex-1 border border-black/15 bg-white px-3 text-sm"
          placeholder={t("designs.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="h-11 border border-black/15 bg-white px-3 text-sm" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
          <option value="">{t("designs.allCategories")}</option>
          {collections.filter((item) => item.active).map((item) => (
            <option key={item.id} value={item.id}>{item.name[lang]}</option>
          ))}
        </select>
        <select className="h-11 border border-black/15 bg-white px-3 text-sm" value={fabricTypeId} onChange={(event) => setFabricTypeId(event.target.value)}>
          <option value="">{t("admin.fabricType")}</option>
          {fabricTypes.filter((item) => item.active).map((item) => (
            <option key={item.id} value={item.id}>{item.name[lang]}</option>
          ))}
        </select>
      </div>
      {!rows.length ? <p className="mt-10 text-sm text-ink/55">{t("designs.emptyList")}</p> : null}
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((fabric) => {
          const image = fabric.design.thumbUrl || fabric.mockups[0]?.thumbUrl;
          const collection = collections.find((item) => item.id === fabric.collectionId);
          const type = fabricTypes.find((item) => item.id === fabric.fabricTypeId);
          return (
            <li key={fabric.id} className="flex flex-col overflow-hidden rounded-sm bg-white shadow-sm">
              <div className="aspect-[5/4] bg-majolica/10">
                {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-ink/40">{t("designs.noImage")}</div>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-mono text-xs text-ink/50">{fabric.art || "—"}</p>
                <h2 className="font-display mt-1 text-xl leading-snug">{fabric.name[lang] || fabric.name.ru || t("common.draft")}</h2>
                <p className="mt-1 text-xs text-ink/55">{[collection?.name[lang], type?.name[lang]].filter(Boolean).join(" · ")}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Badge>{t(statusKey(fabric.status))}</Badge>
                  {fabric.mockups.length ? <Badge tone="gold">{t("designs.mockupCount", { count: fabric.mockups.length })}</Badge> : null}
                </div>
                {canWrite ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(fabric)}>{t("catalogs.edit")}</Button>
                    <Button type="button" size="sm" variant="ghost" className="text-red-900" onClick={() => void remove(fabric)}>{t("common.delete")}</Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {editing ? (
        <FabricEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          initial={editing}
          catalogs={catalogs}
          collections={collections}
          fabricTypes={fabricTypes}
          productTypes={productTypes}
          templates={templates}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
