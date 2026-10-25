"use client";

import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { useState } from "react";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/field";
import { LangTabs } from "@/components/ui/lang-tabs";
import { useI18n } from "@/components/i18n/I18n";
import type { Collection, Fabric, FabricType, Lang, Localized, ProductType } from "@/types";

const EMPTY: Localized = { ru: "", en: "", uz: "" };

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
  const [lang, setLang] = useState<Lang>("ru");
  const text = (field: "name" | "description" | "composition" | "finish" | "finishExtra") => {
    const value = fabric[field] ?? EMPTY;
    return {
      value: value[lang] ?? "",
      placeholder: lang === "ru" ? undefined : value.ru,
      onChange: (event: { target: { value: string } }) => onChange({ [field]: { ...EMPTY, ...value, [lang]: event.target.value } }),
    };
  };
  return (
    <section className="grid gap-4 bg-white p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <LangTabs label={t("catalogs.textLang")} value={lang} onChange={setLang} filled={(item) => Boolean(fabric.name[item]?.trim())} />
        <p className="mt-1.5 text-xs text-ink/50">{t("designs.textLangHint")}</p>
      </div>
      <div>
        <Label>{t("common.name")}</Label>
        <Input {...text("name")} />
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
        <Input list="compositions" {...text("composition")} />
        <datalist id="compositions"><option value="100% хлопок" /><option value="100% полиэстер" /></datalist>
      </div>
      <div>
        <Label>{t("designs.finish")}</Label>
        <Input {...text("finish")} />
      </div>
      <div>
        <Label>{t("designs.finishExtra")}</Label>
        <Input {...text("finishExtra")} />
      </div>
      <div className="md:col-span-2">
        <Label>{t("common.description")}</Label>
        <Textarea {...text("description")} />
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
