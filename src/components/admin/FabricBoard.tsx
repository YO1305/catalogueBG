"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Badge } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { addFabricsToCatalogAction, setFabricStatusAction } from "@/lib/actions";
import { statusKey } from "@/lib/i18n";
import type { Catalog, Collection, Fabric, FabricType, ProductType, Role } from "@/types";

export function FabricBoard({
  role,
  fabrics,
  collections,
  fabricTypes,
  productTypes,
  catalogs,
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
  const [mode, setMode] = useState<"tile" | "table">("tile");
  const [filters, setFilters] = useState({ collection: "", type: "", product: "", status: "", fresh: false, untranslated: false, bare: false });
  const [picked, setPicked] = useState<string[]>([]);
  const [catalogSlug, setCatalogSlug] = useState(catalogs[0]?.slug ?? "");
  const rows = useMemo(() => fabrics.filter((fabric) => {
    if (filters.collection && fabric.collectionId !== filters.collection) return false;
    if (filters.type && fabric.fabricTypeId !== filters.type) return false;
    if (filters.product && !fabric.productTypes.includes(filters.product)) return false;
    if (filters.status && fabric.status !== filters.status) return false;
    if (filters.fresh && !fabric.isNew) return false;
    if (filters.untranslated && fabric.name.en && fabric.name.uz) return false;
    if (filters.bare && fabric.mockups.length) return false;
    return true;
  }), [fabrics, filters]);
  const canWrite = role === "admin" || role === "designer";
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{t("nav.fabrics")}</h1>
        {canWrite ? <Link href="/admin/fabrics/new" className="bg-majolica px-4 py-2 text-sm text-paper">{t("common.create")}</Link> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <select className="h-10 border bg-white px-2" value={filters.collection} onChange={(event) => setFilters({ ...filters, collection: event.target.value })}>
          <option value="">{t("admin.collection")}</option>
          {collections.map((item) => <option key={item.id} value={item.id}>{item.name[lang]}</option>)}
        </select>
        <select className="h-10 border bg-white px-2" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
          <option value="">{t("admin.fabricType")}</option>
          {fabricTypes.map((item) => <option key={item.id} value={item.id}>{item.name[lang]}</option>)}
        </select>
        <select className="h-10 border bg-white px-2" value={filters.product} onChange={(event) => setFilters({ ...filters, product: event.target.value })}>
          <option value="">{t("admin.product")}</option>
          {productTypes.map((item) => <option key={item.id} value={item.id}>{item.name[lang]}</option>)}
        </select>
        <select className="h-10 border bg-white px-2" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">{t("common.status")}</option>
          <option value="draft">{t("common.draft")}</option>
          <option value="published">{t("common.published")}</option>
          <option value="archived">{t("common.archived")}</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filters.fresh} onChange={(event) => setFilters({ ...filters, fresh: event.target.checked })} />{t("admin.onlyNew")}</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filters.untranslated} onChange={(event) => setFilters({ ...filters, untranslated: event.target.checked })} />{t("admin.noTranslation")}</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filters.bare} onChange={(event) => setFilters({ ...filters, bare: event.target.checked })} />{t("admin.noMockups")}</label>
        <Button type="button" size="sm" variant="outline" onClick={() => setMode(mode === "tile" ? "table" : "tile")}>{mode === "tile" ? t("admin.table") : t("admin.tile")}</Button>
      </div>
      {picked.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 bg-white p-3 text-sm">
          <span>{t("admin.selected", { count: picked.length })}</span>
          {canWrite ? <Button type="button" size="sm" onClick={async () => { const result = await setFabricStatusAction(picked, "published"); toast(result.catalogs.length ? t("wizard.published", { names: result.catalogs.join(", ") }) : t("common.published")); router.refresh(); }}>{t("admin.massPublish")}</Button> : null}
          <Button type="button" size="sm" variant="outline" onClick={async () => { await setFabricStatusAction(picked, "archived"); router.refresh(); }}>{t("admin.massArchive")}</Button>
          <select className="h-8 border px-2" value={catalogSlug} onChange={(event) => setCatalogSlug(event.target.value)}>
            {catalogs.map((catalog) => <option key={catalog.slug} value={catalog.slug}>{catalog.title[lang]}</option>)}
          </select>
          <Button type="button" size="sm" variant="outline" onClick={async () => { await addFabricsToCatalogAction(picked, catalogSlug); toast(t("common.save")); }}>{t("admin.addToCatalog")}</Button>
          <Button type="button" size="sm" variant="outline" onClick={async () => { for (const id of picked) await fetch("/api/mockups/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fabricId: id }) }); toast(t("templates.rebuildDone", { count: picked.length })); router.refresh(); }}>{t("admin.rebuild")}</Button>
        </div>
      ) : null}
      {mode === "tile" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((fabric) => (
            <article key={fabric.id} className="bg-white p-3 shadow-sm">
              <label className="text-xs"><input type="checkbox" checked={picked.includes(fabric.id)} onChange={(event) => setPicked((ids) => event.target.checked ? [...ids, fabric.id] : ids.filter((id) => id !== fabric.id))} /></label>
              <Link href={`/admin/fabrics/${fabric.id}`}>
                <img src={fabric.design.thumbUrl || fabric.mockups[0]?.thumbUrl} alt={fabric.name[lang]} className="mt-2 aspect-square w-full object-cover" />
                <p className="font-mono mt-2 text-xs">{fabric.art}</p>
                <h2 className="font-display text-xl">{fabric.name[lang] || fabric.name.ru}</h2>
              </Link>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge>{t(statusKey(fabric.status))}</Badge>
                {fabric.productTypes.map((id) => <Badge key={id} tone="gold">{productTypes.find((item) => item.id === id)?.name[lang] ?? id}</Badge>)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <table className="mt-4 w-full bg-white text-sm">
          <tbody>
            {rows.map((fabric) => (
              <tr key={fabric.id} className="border-b">
                <td className="p-2"><input type="checkbox" checked={picked.includes(fabric.id)} onChange={(event) => setPicked((ids) => event.target.checked ? [...ids, fabric.id] : ids.filter((id) => id !== fabric.id))} /></td>
                <td className="p-2 font-mono">{fabric.art}</td>
                <td className="p-2"><Link href={`/admin/fabrics/${fabric.id}`}>{fabric.name[lang] || fabric.name.ru}</Link></td>
                <td className="p-2">{t(statusKey(fabric.status))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
