"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { FabricCatalogPickSection } from "@/components/admin/FabricCatalogPickSection";
import { FabricDesignSection } from "@/components/admin/FabricDesignSection";
import { FabricSaveStatus } from "@/components/admin/FabricSaveStatus";
import { FabricVariantsSection } from "@/components/admin/FabricVariantsSection";
import { WizardCardStep } from "@/components/admin/WizardCardStep";
import { WizardFabricMockupStep } from "@/components/admin/WizardFabricMockupStep";
import { WizardMockupCategoryStep } from "@/components/admin/WizardMockupCategoryStep";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { FabricToneSection } from "@/components/admin/FabricToneSection";
import { formatSaveClock, savePhaseText } from "@/lib/fabricSavePhase";
import { fabricKind, kindReady } from "@/lib/fabricKind";
import { statusKey } from "@/lib/i18n";
import { useBlockLeave } from "@/lib/useBlockLeave";
import { useFabricEditor } from "@/lib/useFabricEditor";
import { useFabricSaveFlow } from "@/lib/useFabricSaveFlow";
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
  const editor = useFabricEditor(initial, { collections, fabricTypes, finishes, productTypes }, templates, t, { isNew });
  const { fabric, lists, progress, update, upload, chooseTemplate, saveDraft, publish, onCreateCollection, onCreateFabricType } = editor;
  const kind = fabricKind(fabric);
  const save = useFabricSaveFlow(initial, isNew, catalogs, kind, {
    fabric,
    saveDraft,
    publish,
    runMockup: (slot, options) => editor.mockupJobs.run(slot, options),
  });
  const missing = missingTones(fabric);
  const { fillMissingColors } = editor.tones;
  const filledColors = useRef<string | null>(null);
  useEffect(() => {
    if (filledColors.current === fabric.id) return;
    filledColors.current = fabric.id;
    void fillMissingColors();
  }, [fabric.id, fillMissingColors]);
  const ready = useMemo(() => Boolean(kindReady(fabric) && fabric.art && fabric.name.ru), [fabric]);
  const jobs = editor.mockupJobs.progress;
  useBlockLeave(save.busy || save.mockupBusy, t("designs.saveLeave"));

  const draftLabel = save.busy && save.intent === "draft" ? savePhaseText(t, save.phase) || t("wizard.saveDraft") : t("wizard.saveDraft");
  const publishLabel = save.busy && save.intent === "publish"
    ? savePhaseText(t, save.phase) || t("designs.saveAll")
    : jobs
      ? t("designs.mockupsProgress", { done: jobs.done, total: jobs.total })
      : t("designs.saveAll");

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/fabrics?kind=${kind}`} className="text-sm underline">{t("common.back")}</Link>
      <h1 className="font-display mt-2 text-2xl md:text-3xl">{t(isNew ? `designs.createTitle.${kind}` : "designs.editTitle")}</h1>
      <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-ink/60">
        <span>{t(`designs.kind.${kind}`)}</span>
        <span>{t(statusKey(fabric.status))}</span>
        {save.savedAt ? <span>{t("designs.savedAt", { time: formatSaveClock(save.savedAt) })}</span> : null}
      </p>
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
            <WizardMockupCategoryStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={save.saveMockup} />
            <WizardFabricMockupStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={save.saveMockup} />
          </>
        ) : (
          <>
            <WizardFabricMockupStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={save.saveMockup} />
            <WizardMockupCategoryStep fabric={fabric} templates={templates} onChange={update} onChoose={chooseTemplate} onSaveMockup={save.saveMockup} />
          </>
        )}
        <div><h2 className="font-display text-lg">{t("wizard.data")}</h2></div>
        <WizardCardStep fabric={fabric} collections={lists.collections} fabricTypes={lists.fabricTypes} finishes={lists.finishes} productTypes={lists.productTypes} onChange={update} hideCollection onCreateCollection={onCreateCollection} onCreateFabricType={onCreateFabricType} onCreateFinish={editor.onCreateFinish} />
        <FabricCatalogPickSection catalogs={catalogs} selected={save.catalogSlugs} onChange={save.setCatalogSlugs} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-4">
        <Button type="button" variant="outline" disabled={save.busy || save.mockupBusy} onClick={() => void save.finish(false)}>{draftLabel}</Button>
        <Button type="button" disabled={save.busy || save.mockupBusy || Boolean(jobs) || !ready} onClick={() => void save.finish(true)}>
          {publishLabel}
        </Button>
        <FabricSaveStatus phase={save.phase} receipt={save.receipt} />
        {jobs ? <p className="w-full text-sm text-ink/60">{t("designs.mockupsStay")}</p> : null}
        {missing.length ? <p className="w-full text-sm text-amber-700">{t("tone.required", { list: missing.map((tone) => t(`tone.${tone}`)).join(", ") })}</p> : null}
      </div>
    </div>
  );
}
