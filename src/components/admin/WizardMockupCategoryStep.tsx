"use client";

import { MockupAdjuster } from "@/components/admin/MockupAdjuster";
import { useI18n } from "@/components/i18n/I18n";
import { Checkbox, Label, Select } from "@/components/ui/field";
import { MOCKUP_CATEGORIES, mockupCategoryLabelKey, templatesInCategory } from "@/lib/mockupCategories";
import type { Fabric, Mockup, MockupCategory, Template } from "@/types";

export function WizardMockupCategoryStep({
  fabric,
  templates,
  onChange,
  onChoose,
}: {
  fabric: Fabric;
  templates: Template[];
  onChange: (partial: Partial<Fabric>) => void;
  onChoose: (productType: string, template: Template, selected: boolean) => void;
}) {
  const { t } = useI18n();
  const category = fabric.mockupCategory ?? "bedding";
  const list = templatesInCategory(templates, category);

  function pickCategory(next: MockupCategory) {
    const allowed = new Set(templatesInCategory(templates, next).map((item) => item.id));
    onChange({ mockupCategory: next, mockups: fabric.mockups.filter((item) => allowed.has(item.templateId)) });
  }

  return (
    <section className="space-y-4 rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("mockups.pickCategory")}</h2>
      <div>
        <Label>{t("mockups.categoryLabel")}</Label>
        <Select className="mt-1 w-full max-w-xs" value={category} onChange={(event) => pickCategory(event.target.value as MockupCategory)}>
          {MOCKUP_CATEGORIES.map((item) => (
            <option key={item} value={item}>{t(mockupCategoryLabelKey(item))}</option>
          ))}
        </Select>
      </div>
      {!list.length ? <p className="text-sm text-ink/55">{t("mockups.emptyCategory")}</p> : null}
      {list.map((template) => {
        const productType = template.productTypes[0] ?? "fabric-roll";
        const selected = fabric.mockups.find((item) => item.templateId === template.id);
        return (
          <div key={template.id} className="rounded border border-black/10 bg-white p-3">
            <Checkbox
              checked={Boolean(selected)}
              label={`${template.name}${template.kind === "demo" ? ` · ${t("templates.demo")}` : ""}`}
              onCheckedChange={(checked) => onChoose(productType, template, checked)}
            />
            {selected ? (
              <MockupAdjuster
                fabric={fabric}
                template={template}
                mockup={selected}
                onChange={(mockup: Mockup) => onChange({ mockups: fabric.mockups.map((item) => (item.templateId === template.id ? mockup : item)) })}
              />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
