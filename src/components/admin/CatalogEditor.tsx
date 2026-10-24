"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { CatalogThemePicker } from "@/components/admin/CatalogThemePicker";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { createCatalogAction, saveCatalogAction } from "@/lib/actions";
import { buildPages } from "@/lib/catalog";
import type { Catalog, Collection, Fabric, FabricType, ProductType } from "@/types";

const CatalogScreen = dynamic(() => import("@/components/flipbook/CatalogScreen").then((mod) => mod.CatalogScreen), { ssr: false });

function resolvePreviewFabrics(catalog: Catalog, fabrics: Fabric[]) {
  const byId = new Map(fabrics.map((fabric) => [fabric.id, fabric]));
  if (catalog.mode === "manual") {
    return (catalog.fabricIds ?? []).flatMap((id) => {
      const fabric = byId.get(id);
      return fabric ? [fabric] : [];
    });
  }
  return fabrics.filter((fabric) => fabric.status === "published");
}

export function CatalogEditor({
  initial,
  isNew,
  fabrics,
  collections,
  fabricTypes,
  productTypes,
}: {
  initial: Catalog;
  isNew: boolean;
  fabrics: Fabric[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [catalog, setCatalog] = useState(initial);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const resolved = useMemo(() => resolvePreviewFabrics(catalog, fabrics), [catalog, fabrics]);
  const pages = useMemo(() => buildPages(catalog, resolved), [catalog, resolved]);

  function patch(partial: Partial<Catalog>) {
    setCatalog((current) => ({ ...current, ...partial }));
  }

  async function persist(live: boolean) {
    if (!catalog.title.ru.trim()) {
      toast(t("catalogs.errorTitle"));
      return;
    }
    setBusy(true);
    try {
      const payload: Catalog = {
        ...catalog,
        status: live ? "live" : isNew ? "draft" : catalog.status,
        expiresAt: undefined,
        cover: {},
        layout: { ...catalog.layout, sectionBy: "none" },
      };
      const result = isNew
        ? await createCatalogAction(payload, pin || undefined)
        : await saveCatalogAction(payload, pin || undefined);
      if (!result.ok) {
        toast(result.error === "title" ? t("catalogs.errorTitle") : t("catalogs.errorSave"));
        return;
      }
      toast(live ? t("catalogs.saveAndPublish") : t("common.save"));
      if (isNew && "slug" in result) {
        router.replace(`/admin/catalogs/${result.slug}`);
      } else {
        router.refresh();
      }
    } catch {
      toast(t("error.forbidden"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/admin/catalogs" className="text-sm underline">{t("common.back")}</Link>
        <h1 className="font-display text-3xl">{isNew ? t("catalogs.createTitle") : t("catalogs.editTitle")}</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[min(100%,22rem)_1fr]">
        <div className="space-y-4 bg-white p-4 shadow-sm">
          <div>
            <Label>{t("common.name")}</Label>
            <Input value={catalog.title.ru} onChange={(event) => patch({ title: { ...catalog.title, ru: event.target.value } })} />
            <p className="mt-1 text-xs text-ink/50">{t("catalogs.coverTitleHint")}</p>
          </div>
          <div>
            <Label>{t("catalogs.subtitle")}</Label>
            <Textarea value={catalog.subtitle.ru} onChange={(event) => patch({ subtitle: { ...catalog.subtitle, ru: event.target.value } })} />
          </div>
          {!isNew ? (
            <div>
              <Label>{t("catalogs.slug")}</Label>
              <Input value={catalog.slug} readOnly className="bg-black/5" />
            </div>
          ) : null}
          <CatalogThemePicker
            theme={catalog.layout.theme}
            title={catalog.title.ru}
            subtitle={catalog.subtitle.ru}
            onPick={(theme) => patch({ layout: { ...catalog.layout, theme } })}
          />
          <div>
            <Label>{t("catalogs.accessLabel")}</Label>
            <select className="h-10 w-full border bg-white px-2 text-sm" value={catalog.access} onChange={(event) => patch({ access: event.target.value as Catalog["access"] })}>
              <option value="public">{t("catalogs.accessPublic")}</option>
              <option value="unlisted">{t("catalogs.accessUnlisted")}</option>
              <option value="pin">{t("catalogs.accessPin")}</option>
            </select>
          </div>
          {catalog.access === "pin" ? (
            <div>
              <Label>{t("catalogs.pin")}</Label>
              <Input value={pin} maxLength={4} inputMode="numeric" onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} />
            </div>
          ) : null}
          <p className="text-xs text-ink/55">{t("catalogs.pagesAutoHint")}</p>
          <p className="text-xs uppercase tracking-wide text-ink/50">{t("catalogs.backPage")}</p>
          <div>
            <Label>{t("catalogs.contactPhone")}</Label>
            <Input value={catalog.contacts.phone} onChange={(event) => patch({ contacts: { ...catalog.contacts, phone: event.target.value } })} />
          </div>
          <div>
            <Label>{t("catalogs.contactTelegram")}</Label>
            <Input value={catalog.contacts.telegram} onChange={(event) => patch({ contacts: { ...catalog.contacts, telegram: event.target.value } })} />
          </div>
          <div>
            <Label>{t("catalogs.contactEmail")}</Label>
            <Input type="email" value={catalog.contacts.email} onChange={(event) => patch({ contacts: { ...catalog.contacts, email: event.target.value } })} />
          </div>
          <div>
            <Label>{t("catalogs.contactAddress")}</Label>
            <Textarea value={catalog.contacts.address} onChange={(event) => patch({ contacts: { ...catalog.contacts, address: event.target.value } })} />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" disabled={busy} onClick={() => void persist(false)}>{t("common.save")}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void persist(true)}>{t("catalogs.saveAndPublish")}</Button>
          </div>
        </div>
        <div className="min-h-[70vh] overflow-hidden border bg-sand">
          <p className="bg-white/80 px-3 py-2 text-xs text-ink/60">{t("catalogs.preview")}</p>
          <CatalogScreen model={{ catalog, fabrics: resolved, pages, fabricTypes, collections, productTypes, qr: "" }} initialPage={0} />
        </div>
      </div>
    </div>
  );
}
