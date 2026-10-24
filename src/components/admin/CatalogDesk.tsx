"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/field";
import { saveCatalogAction } from "@/lib/actions";
import { buildPages, resolveFabrics } from "@/lib/catalog";
import type { Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

const CatalogScreen = dynamic(() => import("@/components/flipbook/CatalogScreen").then((mod) => mod.CatalogScreen), { ssr: false });

export { CatalogList } from "@/components/admin/CatalogList";

export function CatalogBuilder({ initial, fabrics, collections, fabricTypes, productTypes }: { initial: Catalog; fabrics: Fabric[]; collections: Collection[]; fabricTypes: FabricType[]; productTypes: ProductType[] }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [catalog, setCatalog] = useState(initial);
  const [pin, setPin] = useState("");
  const resolved = useMemo(() => resolveFabrics(catalog, fabrics), [catalog, fabrics]);
  const pages = useMemo(() => buildPages(catalog, resolved), [catalog, resolved]);
  function patch(partial: Partial<Catalog>) {
    setCatalog((current) => ({ ...current, ...partial }));
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form className="space-y-3 bg-white p-4" onSubmit={async (event) => { event.preventDefault(); await saveCatalogAction(catalog, pin || undefined); toast(t("common.save")); router.refresh(); }}>
        <Label>{t("common.name")}</Label>
        <Input value={catalog.title.ru} onChange={(event) => patch({ title: { ...catalog.title, ru: event.target.value } })} />
        <Label>{t("catalogs.subtitle")}</Label>
        <Textarea value={catalog.subtitle.ru} onChange={(event) => patch({ subtitle: { ...catalog.subtitle, ru: event.target.value } })} />
        <Label>{t("catalogs.slug")}</Label>
        <Input value={catalog.slug} readOnly />
        <div className="flex gap-2">
          <Button type="button" variant={catalog.mode === "rules" ? "default" : "outline"} onClick={() => patch({ mode: "rules" })}>{t("catalogs.modeRules")}</Button>
          <Button type="button" variant={catalog.mode === "manual" ? "default" : "outline"} onClick={() => patch({ mode: "manual" })}>{t("catalogs.modeManual")}</Button>
        </div>
        {catalog.mode === "rules" ? (
          <div className="space-y-2 text-sm">
            {collections.map((item) => <Checkbox key={item.id} checked={Boolean(catalog.rules?.collections?.includes(item.id))} label={item.name[lang]} onCheckedChange={(checked) => patch({ rules: { ...catalog.rules, collections: toggle(catalog.rules?.collections, item.id, checked) } })} />)}
            {fabricTypes.map((item) => <Checkbox key={item.id} checked={Boolean(catalog.rules?.fabricTypes?.includes(item.id))} label={item.name[lang]} onCheckedChange={(checked) => patch({ rules: { ...catalog.rules, fabricTypes: toggle(catalog.rules?.fabricTypes, item.id, checked) } })} />)}
            <Checkbox checked={Boolean(catalog.rules?.onlyNew)} label={t("catalogs.onlyNew")} onCheckedChange={(onlyNew) => patch({ rules: { ...catalog.rules, onlyNew } })} />
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-auto text-sm">
            <p className="text-ink/60">{t("catalogs.emptyManual")}</p>
            {(catalog.fabricIds ?? []).map((id, index) => {
              const fabric = fabrics.find((item) => item.id === id);
              if (!fabric) return null;
              return (
                <div key={id} className="flex justify-between gap-2" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  const ids = [...(catalog.fabricIds ?? [])];
                  const [moved] = ids.splice(from, 1);
                  if (moved) ids.splice(index, 0, moved);
                  patch({ fabricIds: ids });
                }}>
                  <span>{fabric.art}</span>
                  <button type="button" onClick={() => patch({ fabricIds: (catalog.fabricIds ?? []).filter((item) => item !== id) })}>{t("common.delete")}</button>
                </div>
              );
            })}
            <select className="h-10 w-full border px-2" value="" onChange={(event) => patch({ fabricIds: [...(catalog.fabricIds ?? []), event.target.value] })}>
              <option value="">{t("common.add")}</option>
              {fabrics.map((fabric) => <option key={fabric.id} value={fabric.id}>{fabric.art}</option>)}
            </select>
          </div>
        )}
        <p className="text-xs uppercase text-ink/50">{t("catalogs.showProducts")}</p>
        {productTypes.map((item) => <Checkbox key={item.id} checked={catalog.showProductTypes.includes(item.id)} label={item.name[lang]} onCheckedChange={(checked) => patch({ showProductTypes: toggle(catalog.showProductTypes, item.id, checked) ?? [] })} />)}
        <Label>{t("catalogs.perPage")}</Label>
        <select className="h-10 w-full border px-2" value={catalog.layout.perPage} onChange={(event) => patch({ layout: { ...catalog.layout, perPage: Number(event.target.value) as 1 | 2 | 3 | 4 } })}>
          {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
        <select className="h-10 w-full border px-2" value={catalog.layout.sectionBy} onChange={(event) => patch({ layout: { ...catalog.layout, sectionBy: event.target.value as Catalog["layout"]["sectionBy"] } })}>
          <option value="none">{t("catalogs.sectionNone")}</option>
          <option value="fabricType">{t("catalogs.sectionType")}</option>
          <option value="collection">{t("catalogs.sectionCollection")}</option>
        </select>
        <div className="flex gap-2">
          <Button type="button" variant={catalog.layout.theme === "light" ? "default" : "outline"} onClick={() => patch({ layout: { ...catalog.layout, theme: "light" } })}>{t("catalogs.themeLight")}</Button>
          <Button type="button" variant={catalog.layout.theme === "dark" ? "default" : "outline"} onClick={() => patch({ layout: { ...catalog.layout, theme: "dark" } })}>{t("catalogs.themeDark")}</Button>
        </div>
        <Checkbox checked={catalog.showPrices} label={t("catalogs.prices")} onCheckedChange={(showPrices) => patch({ showPrices })} />
        <select className="h-10 w-full border px-2" value={catalog.access} onChange={(event) => patch({ access: event.target.value as Catalog["access"] })}>
          <option value="public">{t("catalogs.accessPublic")}</option>
          <option value="unlisted">{t("catalogs.accessUnlisted")}</option>
          <option value="pin">{t("catalogs.accessPin")}</option>
        </select>
        {catalog.access === "pin" ? <Input value={pin} maxLength={4} placeholder={t("catalogs.pin")} onChange={(event) => setPin(event.target.value)} /> : null}
        <Label>{t("catalogs.expires")}</Label>
        <Input type="date" value={catalog.expiresAt?.slice(0, 10) ?? ""} onChange={(event) => patch({ expiresAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t("common.save")}</Button>
          <Button type="button" onClick={async () => { await saveCatalogAction({ ...catalog, status: "live" }, pin || undefined); toast(t("common.live")); }}>{t("common.publish")}</Button>
          <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(`${location.origin}/c/${catalog.slug}`)}>{t("catalogs.copy")}</Button>
          <a className="inline-flex h-10 items-center px-3 text-sm underline" href={`/api/qr?text=${encodeURIComponent(`${typeof location === "undefined" ? "" : location.origin}/c/${catalog.slug}`)}`}>{t("catalogs.qr")}</a>
          <a className="inline-flex h-10 items-center px-3 text-sm underline" href={`/c/${catalog.slug}/pdf`}>{t("catalogs.pdf")}</a>
        </div>
      </form>
      <div className="min-h-[70vh] overflow-hidden border bg-sand">
        <CatalogScreen model={{ catalog, fabrics: resolved, pages, fabricTypes, collections, productTypes, qr: "" }} initialPage={0} />
      </div>
    </div>
  );
}

function toggle(list: string[] | undefined, id: string, checked: boolean) {
  const next = new Set(list ?? []);
  if (checked) next.add(id);
  else next.delete(id);
  return [...next];
}
