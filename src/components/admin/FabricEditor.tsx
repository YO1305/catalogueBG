"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FabricCatalogPickSection } from "@/components/admin/FabricCatalogPickSection";
import { FabricDesignSection } from "@/components/admin/FabricDesignSection";
import { WizardCardStep } from "@/components/admin/WizardCardStep";
import { WizardMockupCategoryStep } from "@/components/admin/WizardMockupCategoryStep";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { addFabricsToCatalogAction } from "@/lib/actions";
import { useFabricEditor } from "@/lib/useFabricEditor";
import type { Catalog, Collection, Fabric, FabricType, ProductType, Template } from "@/types";

export function FabricEditor({
  initial,
  isNew,
  catalogs,
  collections,
  fabricTypes,
  productTypes,
  templates,
}: {
  initial: Fabric;
  isNew: boolean;
  catalogs: Catalog[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  templates: Template[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editor = useFabricEditor(initial, { collections, fabricTypes, productTypes }, templates, t);
  const { fabric, lists, progress, update, upload, chooseTemplate, saveDraft, publish, onCreateCollection, onCreateFabricType } = editor;
  const [catalogSlugs, setCatalogSlugs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const ready = useMemo(
    () => Boolean(fabric.design.webUrl && fabric.rapport.widthCm > 0 && fabric.rapport.heightCm > 0 && fabric.art && fabric.name.ru && fabric.mockupCategory && fabric.mockups.length),
    [fabric],
  );

  async function finish(saveLive: boolean) {
    setBusy(true);
    const result = saveLive ? await publish() : await saveDraft();
    if (!result.ok) {
      toast(t("wizard.artTaken"));
      setBusy(false);
      return;
    }
    const id = fabric.id;
    for (const slug of catalogSlugs) await addFabricsToCatalogAction([id], slug);
    toast(saveLive ? t("designs.savedPublished") : t("wizard.saved"));
    if (isNew) router.push("/admin/fabrics");
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/fabrics" className="text-sm underline">{t("common.back")}</Link>
      <h1 className="font-display mt-2 text-2xl md:text-3xl">{isNew ? t("designs.createTitle") : t("designs.editTitle")}</h1>
      <div className="mt-5 space-y-5">
        <FabricDesignSection fabric={fabric} progress={progress} onChange={update} onUpload={upload} />
        <div><h2 className="font-display text-lg">{t("wizard.data")}</h2></div>
        <WizardCardStep fabric={fabric} collections={lists.collections} fabricTypes={lists.fabricTypes} productTypes={lists.productTypes} onChange={update} hideCollection onCreateCollection={onCreateCollection} onCreateFabricType={onCreateFabricType} />
        <WizardMockupCategoryStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} />
        <FabricCatalogPickSection catalogs={catalogs} selected={catalogSlugs} onChange={setCatalogSlugs} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-4">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void finish(false)}>{t("wizard.saveDraft")}</Button>
        <Button type="button" disabled={busy || !ready} onClick={() => void finish(true)}>{t("designs.saveAll")}</Button>
      </div>
    </div>
  );
}
