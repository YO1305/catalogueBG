"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FabricCatalogPickSection } from "@/components/admin/FabricCatalogPickSection";
import { FabricDesignSection } from "@/components/admin/FabricDesignSection";
import { FabricVariantsSection } from "@/components/admin/FabricVariantsSection";
import { WizardCardStep } from "@/components/admin/WizardCardStep";
import { WizardFabricMockupStep } from "@/components/admin/WizardFabricMockupStep";
import { WizardMockupCategoryStep } from "@/components/admin/WizardMockupCategoryStep";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { addFabricsToCatalogAction } from "@/lib/actions";
import type { MockupSaveStep } from "@/lib/mockup/clientRender";
import { fabricKind, kindReady } from "@/lib/fabricKind";
import { useFabricEditor } from "@/lib/useFabricEditor";
import { FabricToneSection } from "@/components/admin/FabricToneSection";
import { missingTones } from "@/lib/variants";
import type { Catalog, Collection, Fabric, FabricType, Finish, ProductType, Template } from "@/types";

export function FabricEditor({
  initial,
  isNew,
  catalogs,
  collections,
  fabricTypes,
  finishes,
  productTypes,
  templates,
}: {
  initial: Fabric;
  isNew: boolean;
  catalogs: Catalog[];
  collections: Collection[];
  fabricTypes: FabricType[];
  finishes: Finish[];
  productTypes: ProductType[];
  templates: Template[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editor = useFabricEditor(initial, { collections, fabricTypes, finishes, productTypes }, templates, t, { isNew });
  const { fabric, lists, progress, update, upload, chooseTemplate, saveDraft, publish, onCreateCollection, onCreateFabricType } = editor;
  const [catalogSlugs, setCatalogSlugs] = useState<string[]>(() =>
    catalogs.filter((catalog) => catalog.fabricIds?.includes(initial.id)).map((catalog) => catalog.slug),
  );
  const [busy, setBusy] = useState(false);

  const kind = fabricKind(fabric);
  const missing = missingTones(fabric);
  const { fillMissingColors } = editor.tones;
  const filledColors = useRef<string | null>(null);
  useEffect(() => {
    if (filledColors.current === fabric.id) return;
    filledColors.current = fabric.id;
    void fillMissingColors();
  }, [fabric.id, fillMissingColors]);
  const ready = useMemo(() => Boolean(kindReady(fabric) && fabric.art && fabric.name.ru), [fabric]);

  async function finish(saveLive: boolean) {
    setBusy(true);
    try {
      const result = saveLive ? await publish() : await saveDraft();
      if (!result.ok) {
        toast(t("wizard.artTaken"));
        return;
      }
      const id = fabric.id;
      if (catalogSlugs.length) {
        await Promise.all(catalogSlugs.map((slug) => addFabricsToCatalogAction([id], slug)));
      } else if (saveLive) {
        toast(t("designs.pickCatalogToPublish"));
      }
      toast(saveLive ? t("designs.savedPublished") : t("wizard.saved"));
      if (isNew) router.push(`/admin/fabrics?kind=${kind}`);
    } catch {
      toast(t("designs.saveFailed"));
    } finally {
      setBusy(false);
    }
  }
  const jobs = editor.mockupJobs.progress;

  async function saveMockup(
    slot: Parameters<typeof editor.mockupJobs.run>[0],
    onProgress?: (step: MockupSaveStep) => void,
    signal?: AbortSignal,
  ) {
    let openedEdit = false;
    return editor.mockupJobs.run(slot, {
      onProgress,
      signal,
      onPersisted: (persisted) => {
        if (!isNew || openedEdit) return;
        openedEdit = true;
        router.replace(`/admin/fabrics/${persisted.id}`);
      },
    });
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/fabrics?kind=${kind}`} className="text-sm underline">{t("common.back")}</Link>
      <h1 className="font-display mt-2 text-2xl md:text-3xl">{t(isNew ? `designs.createTitle.${kind}` : "designs.editTitle")}</h1>
      <p className="mt-1 text-sm text-ink/60">{t(`designs.kind.${kind}`)}</p>
      <div className="mt-5 space-y-5">
        {kind === "dyed" ? (
          <FabricToneSection fabric={fabric} progress={progress} onUploadMain={upload} onUploadTone={(tone, file) => void editor.tones.uploadTone(tone, file)} onPatchTone={editor.tones.patchTone} onPatchWeave={editor.weave.patchWeave} />
        ) : (
          <>
            <FabricDesignSection fabric={fabric} progress={progress} weave={editor.weave} onChange={update} onUpload={upload} />
            <FabricVariantsSection fabric={fabric} progress={progress} onChange={update} onAdd={(file) => void editor.addVariant(file)} onPatch={editor.patchVariant} onRemove={editor.removeVariant} />
          </>
        )}
        {kind === "woven" ? (
          <>
            <WizardMockupCategoryStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={saveMockup} />
            <WizardFabricMockupStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={saveMockup} />
          </>
        ) : (
          <>
            <WizardFabricMockupStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={saveMockup} />
            <WizardMockupCategoryStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={saveMockup} />
          </>
        )}
        <div><h2 className="font-display text-lg">{t("wizard.data")}</h2></div>
        <WizardCardStep fabric={fabric} collections={lists.collections} fabricTypes={lists.fabricTypes} finishes={lists.finishes} productTypes={lists.productTypes} onChange={update} hideCollection onCreateCollection={onCreateCollection} onCreateFabricType={onCreateFabricType} onCreateFinish={editor.onCreateFinish} />
        <FabricCatalogPickSection catalogs={catalogs} selected={catalogSlugs} onChange={setCatalogSlugs} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-4">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void finish(false)}>{t("wizard.saveDraft")}</Button>
        <Button type="button" disabled={busy || Boolean(jobs) || !ready} onClick={() => void finish(true)}>
          {jobs ? t("designs.mockupsProgress", { done: jobs.done, total: jobs.total }) : t("designs.saveAll")}
        </Button>
        {jobs ? <p className="w-full text-sm text-ink/60">{t("designs.mockupsStay")}</p> : null}
        {missing.length ? <p className="w-full text-sm text-amber-700">{t("tone.required", { list: missing.map((tone) => t(`tone.${tone}`)).join(", ") })}</p> : null}
      </div>
    </div>
  );
}
