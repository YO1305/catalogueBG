"use client";

import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { MockupAdjuster } from "@/components/admin/MockupAdjuster";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import type { Fabric, FabricType, Mockup, ProductType, Template } from "@/types";

export function WizardMockupStep({
  fabric,
  fabricTypes,
  productTypes,
  templates,
  onChange,
  onChoose,
  onCreateProduct,
}: {
  fabric: Fabric;
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  templates: Template[];
  onChange: (partial: Partial<Fabric>) => void;
  onChoose: (productType: string, template: Template, selected: boolean) => void;
  onCreateProduct: (name: string, extra?: { auto?: boolean; ids: string[] }) => Promise<ProductType | null>;
}) {
  const { t } = useI18n();
  return (
    <section className="space-y-4">
      <div className="bg-white p-4">
        <p className="text-sm">{t("wizard.products")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {productTypes.filter((item) => item.active).map((product) => {
            const hasTemplate = templates.some((template) => template.productTypes.includes(product.id));
            return (
              <div key={product.id}>
                <Checkbox
                  checked={fabric.productTypes.includes(product.id)}
                  label={`${product.name.ru}${hasTemplate ? "" : ` · ${t("wizard.noTemplate")}`}`}
                  onCheckedChange={(checked) => onChange({ productTypes: checked ? [...fabric.productTypes, product.id] : fabric.productTypes.filter((id) => id !== product.id) })}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 max-w-sm">
          <CreatableSelect label={t("wizard.products")} value="" options={productTypes} onChange={() => undefined} onCreate={onCreateProduct} extra={{ label: t("settings.suggestFor"), options: fabricTypes.map((item) => ({ id: item.id, label: item.name.ru })) }} />
        </div>
      </div>
      {fabric.productTypes.map((productId) => (
        <div key={productId} className="space-y-3">
          <h3 className="font-display text-2xl">{productTypes.find((item) => item.id === productId)?.name.ru}</h3>
          {templates.filter((template) => template.productTypes.includes(productId)).map((template) => {
            const selected = fabric.mockups.find((item) => item.templateId === template.id && item.productType === productId);
            return (
              <div key={template.id}>
                <Checkbox checked={Boolean(selected)} label={template.name} onCheckedChange={(checked) => onChoose(productId, template, checked)} />
                {selected ? (
                  <MockupAdjuster
                    fabric={fabric}
                    template={template}
                    mockup={selected}
                    onChange={(mockup: Mockup) => onChange({ mockups: fabric.mockups.map((item) => (item.templateId === template.id && item.productType === productId ? mockup : item)) })}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange({ mockups: fabric.mockups.map((item) => ({ ...item, areas: fabric.mockups[0]?.areas ?? item.areas, sameForAllAreas: true })) })}>{t("wizard.applyAll")}</Button>
    </section>
  );
}
