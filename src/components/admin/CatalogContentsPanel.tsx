"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18n";
import { CatalogDesignQuickAdd } from "@/components/admin/CatalogDesignQuickAdd";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { catalogFabricIdOrder, catalogHasManualSections } from "@/lib/catalogSections";
import { isDesignCatalog } from "@/lib/catalogKind";
import type { Catalog, CatalogSection, Fabric, Lang } from "@/types";

function newSection(): CatalogSection {
  return { id: crypto.randomUUID(), title: { ru: "", en: "", uz: "" }, fabricIds: [] };
}

export function CatalogContentsPanel({
  catalog,
  fabrics,
  isNew,
  editLang,
  onChange,
}: {
  catalog: Catalog;
  fabrics: Fabric[];
  isNew: boolean;
  editLang: Lang;
  onChange: (next: Catalog) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const designCatalog = isDesignCatalog(catalog);
  const byId = useMemo(() => new Map(fabrics.map((f) => [f.id, f])), [fabrics]);
  const sections = catalog.catalogSections ?? [];
  const hasSections = catalogHasManualSections(catalog);

  function patch(partial: Partial<Catalog>) {
    onChange({ ...catalog, ...partial });
  }

  function setSections(next: CatalogSection[]) {
    const fabricIds = next.flatMap((s) => s.fabricIds);
    patch({ catalogSections: next, fabricIds: [...new Set([...fabricIds])] });
  }

  function removeFabric(id: string) {
    if (hasSections) {
      setSections(sections.map((s) => ({ ...s, fabricIds: s.fabricIds.filter((x) => x !== id) })));
    } else {
      patch({ fabricIds: (catalog.fabricIds ?? []).filter((x) => x !== id) });
    }
  }

  function addExisting(id: string, sectionId?: string) {
    if (hasSections && sectionId) {
      setSections(sections.map((s) => (s.id === sectionId ? { ...s, fabricIds: [...s.fabricIds, id] } : s)));
    } else {
      patch({ fabricIds: [...new Set([...(catalog.fabricIds ?? []), id])] });
    }
  }

  function renderFabricRow(id: string, sectionId?: string) {
    const fabric = byId.get(id);
    if (!fabric) return null;
    return (
      <div key={id} className="flex items-center justify-between gap-2 rounded-md bg-ink/[0.03] px-2 py-1.5 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-mono text-xs">{fabric.art}</span> · {fabric.name.ru || fabric.name[editLang]}
        </span>
        <button type="button" className="shrink-0 text-xs underline" onClick={() => removeFabric(id)}>
          {t("common.delete")}
        </button>
      </div>
    );
  }

  const orderedIds = catalogFabricIdOrder(catalog);

  return (
    <div className="space-y-4 rounded-sm border border-black/10 bg-white/80 p-3">
      <div>
        <Label>{t("catalogs.contents")}</Label>
        <p className="mt-1 text-xs text-ink/55">{designCatalog ? t("catalogs.contentsDesignHint") : t("catalogs.contentsStandardHint")}</p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-ink/70">{t("catalogs.manualSections")}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => patch({ catalogSections: [...sections, newSection()] })}>
            {t("catalogs.sectionAdd")}
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-ink/50">{t("catalogs.manualSectionsHint")}</p>
        {sections.length ? (
          <div className="mt-3 space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="rounded-md border border-black/10 p-2">
                <Input
                  value={section.title[editLang] ?? ""}
                  placeholder={t("catalogs.sectionName")}
                  onChange={(event) =>
                    setSections(
                      sections.map((s) =>
                        s.id === section.id ? { ...s, title: { ...s.title, ru: s.title.ru ?? "", en: s.title.en ?? "", uz: s.title.uz ?? "", [editLang]: event.target.value } } : s,
                      ),
                    )
                  }
                />
                <div className="mt-2 space-y-1">{section.fabricIds.map((id) => renderFabricRow(id, section.id))}</div>
                {designCatalog ? (
                  <div className="mt-2">
                    <CatalogDesignQuickAdd slug={catalog.slug} sectionId={section.id} disabled={isNew} onAdded={() => router.refresh()} />
                  </div>
                ) : (
                  <select className="mt-2 h-9 w-full border px-2 text-sm" value="" onChange={(event) => event.target.value && addExisting(event.target.value, section.id)}>
                    <option value="">{t("catalogs.pickFabric")}</option>
                    {fabrics.filter((f) => f.status === "published" && !section.fabricIds.includes(f.id)).map((f) => (
                      <option key={f.id} value={f.id}>{f.art}</option>
                    ))}
                  </select>
                )}
                <button type="button" className="mt-2 text-xs text-ink/50 underline" onClick={() => patch({ catalogSections: sections.filter((s) => s.id !== section.id) })}>
                  {t("catalogs.sectionRemove")}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {designCatalog && !hasSections ? (
        <CatalogDesignQuickAdd slug={catalog.slug} disabled={isNew} onAdded={() => router.refresh()} />
      ) : null}

      {!hasSections ? (
        <div className="space-y-1">
          {orderedIds.map((id) => renderFabricRow(id))}
          {!designCatalog ? (
            <select className="h-9 w-full border px-2 text-sm" value="" onChange={(event) => event.target.value && addExisting(event.target.value)}>
              <option value="">{t("catalogs.pickFabric")}</option>
              {fabrics.filter((f) => f.status === "published" && !(catalog.fabricIds ?? []).includes(f.id)).map((f) => (
                <option key={f.id} value={f.id}>{f.art}</option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
