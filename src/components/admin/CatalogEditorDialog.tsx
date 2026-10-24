"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/field";
import { createCatalogAction, saveCatalogAction } from "@/lib/actions";
import { emptyCatalogDraft } from "@/lib/catalogDraft";
import type { Catalog, Fabric } from "@/types";

export function CatalogEditorDialog({
  open,
  onOpenChange,
  initial,
  fabrics,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Catalog | null;
  fabrics: Fabric[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const isNew = !initial?.slug;
  const [catalog, setCatalog] = useState<Catalog>(initial ?? emptyCatalogDraft());
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!open) return;
    setCatalog(initial ?? emptyCatalogDraft());
    setPin("");
  }, [open, initial]);

  function patch(partial: Partial<Catalog>) {
    setCatalog((current) => ({ ...current, ...partial }));
  }

  async function submit(live: boolean) {
    const payload = { ...catalog, status: live ? "live" as const : catalog.status };
    const result = isNew
      ? await createCatalogAction(payload, pin || undefined)
      : await saveCatalogAction(payload, pin || undefined);
    if (!result.ok) return;
    toast(t("common.save"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,42rem)] max-w-none">
        <DialogTitle>{isNew ? t("catalogs.createTitle") : t("catalogs.editTitle")}</DialogTitle>
        <div className="mt-4 space-y-3">
          <div>
            <Label>{t("common.name")}</Label>
            <Input value={catalog.title.ru} onChange={(event) => patch({ title: { ...catalog.title, ru: event.target.value } })} required />
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
          <div>
            <Label>{t("catalogs.coverImage")}</Label>
            <Input value={catalog.cover.imageUrl ?? ""} placeholder="https://…" onChange={(event) => patch({ cover: { ...catalog.cover, imageUrl: event.target.value } })} />
          </div>
          <div>
            <Label>{t("catalogs.coverFabric")}</Label>
            <select
              className="h-10 w-full border bg-white px-2 text-sm"
              value={catalog.cover.fabricId ?? ""}
              onChange={(event) => patch({ cover: { ...catalog.cover, fabricId: event.target.value || undefined } })}
            >
              <option value="">{t("catalogs.coverFabricNone")}</option>
              {fabrics.map((fabric) => (
                <option key={fabric.id} value={fabric.id}>
                  {fabric.art} — {fabric.name.ru}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink/55">{t("catalogs.styleHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={catalog.layout.theme === "light" ? "default" : "outline"} onClick={() => patch({ layout: { ...catalog.layout, theme: "light" } })}>
              {t("catalogs.themeLight")}
            </Button>
            <Button type="button" size="sm" variant={catalog.layout.theme === "dark" ? "default" : "outline"} onClick={() => patch({ layout: { ...catalog.layout, theme: "dark" } })}>
              {t("catalogs.themeDark")}
            </Button>
          </div>
          <div>
            <Label>{t("catalogs.perPage")}</Label>
            <select className="h-10 w-full border bg-white px-2" value={catalog.layout.perPage} onChange={(event) => patch({ layout: { ...catalog.layout, perPage: Number(event.target.value) as Catalog["layout"]["perPage"] } })}>
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("catalogs.accessLabel")}</Label>
            <select className="h-10 w-full border bg-white px-2" value={catalog.access} onChange={(event) => patch({ access: event.target.value as Catalog["access"] })}>
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
          <div>
            <Label>{t("catalogs.expires")}</Label>
            <Input type="date" value={catalog.expiresAt?.slice(0, 10) ?? ""} onChange={(event) => patch({ expiresAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} />
          </div>
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
            <Button type="button" onClick={() => void submit(false)}>
              {t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void submit(true)}>
              {t("catalogs.saveAndPublish")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
