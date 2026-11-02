"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Label, Select } from "@/components/ui/field";
import type { CatalogSection } from "@/types";

export function CatalogSectionField({
  sections,
  value,
  onChange,
}: {
  sections: CatalogSection[];
  value: string | null;
  onChange: (sectionId: string | null) => void;
}) {
  const { lang, t } = useI18n();
  if (!sections.length) return null;
  return (
    <div>
      <Label>{t("catalogs.sectionPick")}</Label>
      <Select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} aria-label={t("catalogs.sectionPick")}>
        <option value="">{t("catalogs.sectionUnset")}</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.title[lang]?.trim() || section.title.ru?.trim() || t("catalogs.sectionName")}
          </option>
        ))}
      </Select>
    </div>
  );
}
