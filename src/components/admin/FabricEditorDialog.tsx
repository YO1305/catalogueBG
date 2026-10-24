"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FabricCatalogPickSection } from "@/components/admin/FabricCatalogPickSection";
import { FabricCategorySection } from "@/components/admin/FabricCategorySection";
import { FabricDesignSection } from "@/components/admin/FabricDesignSection";
import { WizardCardStep } from "@/components/admin/WizardCardStep";
import { WizardMockupStep } from "@/components/admin/WizardMockupStep";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { addFabricsToCatalogAction } from "@/lib/actions";
import { useFabricEditor } from "@/lib/useFabricEditor";
import type { Catalog, Collection, Fabric, FabricType, ProductType, Template } from "@/types";

export function FabricEditorDialog({
  open,
  onOpenChange,
  initial,
  catalogs,
  collections,
  fabricTypes,
  productTypes,
  templates,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Fabric;
  catalogs: Catalog[];
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  templates: Template[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const isNew = !initial.art && initial.status === "draft";
  const editor = useFabricEditor(initial, { collections, fabricTypes, productTypes }, templates, t);
  const { fabric, lists, progress, update, upload, chooseTemplate, applyCollectionCategory, saveDraft, publish, onCreateCollection, onCreateFabricType, onCreateProduct } = editor;
  const [catalogSlugs, setCatalogSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setCatalogSlugs([]);
  }, [open, initial.id]);

  const ready = useMemo(
    () => Boolean(fabric.design.webUrl && fabric.rapport.widthCm > 0 && fabric.rapport.heightCm > 0 && fabric.art && fabric.name.ru && fabric.collectionId && fabric.mockups.length),
    [fabric],
  );

  async function finish(saveLive: boolean) {
    const result = saveLive ? await publish() : await saveDraft();
    if (!result.ok) {
      toast(t("wizard.artTaken"));
      return;
    }
    const id = fabric.id;
    for (const slug of catalogSlugs) {
      await addFabricsToCatalogAction([id], slug);
    }
    toast(saveLive ? t("designs.savedPublished") : t("wizard.saved"));
    if (saveLive && result.ok && "catalogs" in result && result.catalogs.length) {
      toast(t("wizard.published", { names: result.catalogs.join(", ") }));
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[min(98vw,52rem)] max-w-none overflow-y-auto">
        <DialogTitle>{isNew ? t("designs.createTitle") : t("designs.editTitle")}</DialogTitle>
        <div className="mt-4 space-y-5">
          <FabricDesignSection fabric={fabric} progress={progress} onChange={update} onUpload={upload} />
          <div>
            <h2 className="font-display text-lg">{t("wizard.data")}</h2>
          </div>
          <WizardCardStep
            fabric={fabric}
            collections={lists.collections}
            fabricTypes={lists.fabricTypes}
            productTypes={lists.productTypes}
            onChange={update}
            hideCollection
            onCreateCollection={onCreateCollection}
            onCreateFabricType={onCreateFabricType}
          />
          <FabricCategorySection
            collectionId={fabric.collectionId}
            collections={lists.collections}
            fabricTypes={lists.fabricTypes}
            fabricTypeId={fabric.fabricTypeId}
            onCollection={applyCollectionCategory}
            onCreateCollection={onCreateCollection}
          />
          {fabric.collectionId ? (
            <WizardMockupStep
              fabric={fabric}
              fabricTypes={lists.fabricTypes}
              productTypes={lists.productTypes}
              templates={templates}
              onChange={update}
              onChoose={chooseTemplate}
              onCreateProduct={onCreateProduct}
            />
          ) : (
            <p className="text-sm text-ink/55">{t("designs.pickCategoryFirst")}</p>
          )}
          <FabricCatalogPickSection catalogs={catalogs} selected={catalogSlugs} onChange={setCatalogSlugs} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-4">
          <Button type="button" variant="outline" onClick={() => void finish(false)}>{t("wizard.saveDraft")}</Button>
          <Button type="button" disabled={!ready} onClick={() => void finish(true)}>{t("designs.saveAll")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
