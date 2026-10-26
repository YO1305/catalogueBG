"use client";

import { MockupAdjuster } from "@/components/admin/MockupAdjuster";
import { useI18n } from "@/components/i18n/I18n";
import { Checkbox } from "@/components/ui/field";
import { FABRIC_PRODUCT } from "@/lib/mockup/constants";
import { templateFitsFabric } from "@/lib/mockup/weave";
import type { Fabric, Mockup, Template } from "@/types";

export function WizardFabricMockupStep({
  fabric,
  templates,
  onChange,
  onChoose,
  onSaveMockup,
}: {
  fabric: Fabric;
  templates: Template[];
  onChange: (partial: Partial<Fabric>) => void;
  onChoose: (productType: string, template: Template, selected: boolean) => void;
  onSaveMockup: (slot: Pick<Mockup, "templateId" | "productType">) => Promise<number>;
}) {
  const { t } = useI18n();
  const list = templates.filter((item) => item.productTypes.includes(FABRIC_PRODUCT));

  function setPrimary(templateId: string) {
    onChange({
      mockups: fabric.mockups.map((item) =>
        item.productType === FABRIC_PRODUCT ? { ...item, isPrimary: item.templateId === templateId } : item,
      ),
    });
  }

  return (
    <section className="space-y-4 rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("mockups.fabricStep")}</h2>
      <p className="text-sm text-ink/60">{t("mockups.fabricStepHint")}</p>
      {!list.length ? <p className="text-sm text-ink/55">{t("mockups.fabricEmpty")}</p> : null}
      {list.map((template) => {
        const selected = fabric.mockups.find((item) => item.templateId === template.id && item.productType === FABRIC_PRODUCT);
        if (!templateFitsFabric(fabric, template)) {
          return (
            <div key={template.id} className="rounded border border-black/10 bg-black/[0.03] p-3 text-sm text-ink/40">
              {template.name} · {t("weave.notForWoven")}
            </div>
          );
        }
        return (
          <div key={template.id} className="rounded border border-black/10 bg-white p-3">
            <Checkbox
              checked={Boolean(selected)}
              label={template.name}
              onCheckedChange={(checked) => onChoose(FABRIC_PRODUCT, template, checked)}
            />
            {selected ? (
              <>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`primary-fabric-${fabric.id}`}
                    checked={Boolean(selected.isPrimary)}
                    onChange={() => setPrimary(template.id)}
                  />
                  {t("mockups.primaryFabric")}
                </label>
                <MockupAdjuster
                  fabric={fabric}
                  template={template}
                  mockup={selected}
                  onChange={(mockup: Mockup) =>
                    onChange({
                      mockups: fabric.mockups.map((item) =>
                        item.templateId === template.id && item.productType === FABRIC_PRODUCT ? mockup : item,
                      ),
                    })
                  }
                  onSave={() => onSaveMockup(selected)}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
