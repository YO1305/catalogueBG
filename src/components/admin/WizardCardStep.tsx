"use client";

import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/field";
import { useI18n } from "@/components/i18n/I18n";
import type { Collection, Fabric, FabricType, ProductType } from "@/types";

export function WizardCardStep({
  fabric,
  collections,
  fabricTypes,
  productTypes,
  onChange,
  onCreateCollection,
  onCreateFabricType,
  hideCollection,
}: {
  fabric: Fabric;
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  onChange: (partial: Partial<Fabric>) => void;
  onCreateCollection: (name: string, extra?: { ids?: string[]; auto?: boolean }) => Promise<Collection | null>;
  onCreateFabricType: (name: string, extra?: { ids?: string[]; auto?: boolean }) => Promise<FabricType | null>;
  hideCollection?: boolean;
}) {
  const { t } = useI18n();
  return (
    <section className="grid gap-4 bg-white p-5 md:grid-cols-2">
      <div>
        <Label>{t("common.name")}</Label>
        <Input value={fabric.name.ru} onChange={(event) => onChange({ name: { ...fabric.name, ru: event.target.value } })} />
      </div>
      <div>
        <Label>{t("wizard.art")}</Label>
        <Input value={fabric.art} onChange={(event) => onChange({ art: event.target.value })} />
      </div>
      {hideCollection ? null : (
        <CreatableSelect label={t("admin.collection")} value={fabric.collectionId} options={collections} onChange={(collectionId) => onChange({ collectionId })} onCreate={onCreateCollection} extra={{ label: "", options: [], auto: true }} />
      )}
      <CreatableSelect
        label={t("admin.fabricType")}
        value={fabric.fabricTypeId}
        options={fabricTypes}
        onChange={(fabricTypeId) => {
          const type = fabricTypes.find((item) => item.id === fabricTypeId);
          onChange({ fabricTypeId, productTypes: fabric.productTypes.length ? fabric.productTypes : type?.suggestedProductTypes ?? [] });
        }}
        onCreate={onCreateFabricType}
        extra={{ label: t("settings.suggest"), options: productTypes.map((item) => ({ id: item.id, label: item.name.ru })) }}
      />
      <div>
        <Label>{t("wizard.density")}</Label>
        <Input value={fabric.density} onChange={(event) => onChange({ density: event.target.value })} />
        <p className="mt-1 text-xs text-ink/50">{t("wizard.densityHint")}</p>
      </div>
      <div>
        <Label>{t("wizard.width")}</Label>
        <Input value={fabric.width} onChange={(event) => onChange({ width: event.target.value })} />
        <p className="mt-1 text-xs text-ink/50">{t("wizard.widthHint")}</p>
      </div>
      <div className="md:col-span-2">
        <Label>{t("wizard.composition")}</Label>
        <Input list="compositions" value={fabric.composition.ru} onChange={(event) => onChange({ composition: { ...fabric.composition, ru: event.target.value } })} />
        <datalist id="compositions"><option value="100% хлопок" /><option value="100% полиэстер" /></datalist>
      </div>
      <div>
        <Label>{t("designs.finish")}</Label>
        <Input value={fabric.finish?.ru ?? ""} onChange={(event) => onChange({ finish: { ru: event.target.value, en: fabric.finish?.en ?? "", uz: fabric.finish?.uz ?? "" } })} />
      </div>
      <div>
        <Label>{t("designs.finishExtra")}</Label>
        <Input value={fabric.finishExtra?.ru ?? ""} onChange={(event) => onChange({ finishExtra: { ru: event.target.value, en: fabric.finishExtra?.en ?? "", uz: fabric.finishExtra?.uz ?? "" } })} />
      </div>
      <div className="md:col-span-2">
        <Label>{t("common.description")}</Label>
        <Textarea value={fabric.description.ru} onChange={(event) => onChange({ description: { ...fabric.description, ru: event.target.value } })} />
      </div>
      <div>
        <Label>{t("wizard.tags")}</Label>
        <Input value={fabric.tags.join(", ")} onChange={(event) => onChange({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
        <p className="mt-1 text-xs text-ink/50">{t("wizard.tagsHint")}</p>
      </div>
      <Checkbox checked={fabric.isNew} onCheckedChange={(isNew) => onChange({ isNew })} label={t("wizard.isNew")} />
    </section>
  );
}
