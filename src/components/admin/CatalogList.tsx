"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CatalogEditorDialog } from "@/components/admin/CatalogEditorDialog";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { deleteCatalogAction } from "@/lib/actions";
import type { Catalog, Fabric } from "@/types";

export function CatalogList({ catalogs, fabrics }: { catalogs: Catalog[]; fabrics: Fabric[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Catalog | null>(null);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(catalog: Catalog) {
    setEditing(catalog);
    setEditorOpen(true);
  }

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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{t("nav.catalogs")}</h1>
        <Button type="button" onClick={openCreate}>
          {t("catalogs.create")}
        </Button>
      </div>
      {!catalogs.length ? <p className="mt-8 text-sm text-ink/60">{t("catalogs.emptyList")}</p> : null}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {catalogs.map((catalog) => {
          const coverFabric = fabrics.find((item) => item.id === catalog.cover.fabricId);
          const image = catalog.cover.imageUrl || coverFabric?.design.thumbUrl || coverFabric?.mockups[0]?.thumbUrl;
          return (
            <li key={catalog.slug} className="flex flex-col overflow-hidden rounded-sm bg-white shadow-sm">
              <div className="aspect-[4/3] bg-majolica/15">
                {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-ink/40">{t("catalogs.noCover")}</div>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-display text-xl leading-tight">{catalog.title.ru || catalog.slug}</h2>
                <p className="mt-1 text-xs text-ink/50">{catalog.status === "live" ? t("common.published") : t("common.draft")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(catalog)}>
                    {t("catalogs.edit")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={`/c/${catalog.slug}`} target="_blank" rel="noreferrer">
                      {t("catalogs.view")}
                    </a>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void copyLink(catalog.slug)}>
                    {t("catalogs.copy")}
                  </Button>
                </div>
                <Button type="button" size="sm" variant="ghost" className="mt-2 self-start text-red-900" onClick={() => void remove(catalog.slug, catalog.title.ru)}>
                  {t("common.delete")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <CatalogEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        fabrics={fabrics}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
