"use client";

import { useI18n } from "@/components/i18n/I18n";
import { CatalogSectionField } from "@/components/admin/CatalogSectionField";
import { Checkbox } from "@/components/ui/field";
import type { CatalogPick } from "@/lib/catalogMembership";
import type { Catalog } from "@/types";

export function FabricCatalogPickSection({
  catalogs,
  selected,
  onChange,
}: {
  catalogs: Catalog[];
  selected: CatalogPick[];
  onChange: (picks: CatalogPick[]) => void;
}) {
  const { lang, t } = useI18n();
  if (!catalogs.length) return <p className="text-sm text-ink/55">{t("designs.noCatalogs")}</p>;
  return (
    <section className="rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("designs.addToCatalogs")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("designs.addToCatalogsHint")}</p>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
        {catalogs.map((catalog) => {
          const pick = selected.find((item) => item.slug === catalog.slug);
          const sections = catalog.catalogSections ?? [];
          return (
            <li key={catalog.slug}>
              <Checkbox
                checked={Boolean(pick)}
                label={catalog.title[lang] || catalog.title.ru}
                onCheckedChange={(value) => {
                  if (value) onChange([...selected, { slug: catalog.slug, sectionId: sections[0]?.id ?? null }]);
                  else onChange(selected.filter((item) => item.slug !== catalog.slug));
                }}
              />
              {pick && sections.length ? (
                <div className="mt-1 pl-7">
                  <CatalogSectionField
                    sections={sections}
                    value={pick.sectionId}
                    onChange={(sectionId) => onChange(selected.map((item) => (item.slug === catalog.slug ? { ...item, sectionId } : item)))}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
