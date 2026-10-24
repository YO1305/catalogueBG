"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Checkbox } from "@/components/ui/field";
import type { Catalog } from "@/types";

export function FabricCatalogPickSection({
  catalogs,
  selected,
  onChange,
}: {
  catalogs: Catalog[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  const { lang, t } = useI18n();
  if (!catalogs.length) return <p className="text-sm text-ink/55">{t("designs.noCatalogs")}</p>;
  return (
    <section className="rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("designs.addToCatalogs")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("designs.addToCatalogsHint")}</p>
      <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
        {catalogs.map((catalog) => {
          const checked = selected.includes(catalog.slug);
          return (
            <li key={catalog.slug}>
              <Checkbox
                checked={checked}
                label={catalog.title[lang] || catalog.title.ru}
                onCheckedChange={(value) => {
                  if (value) onChange([...selected, catalog.slug]);
                  else onChange(selected.filter((slug) => slug !== catalog.slug));
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
