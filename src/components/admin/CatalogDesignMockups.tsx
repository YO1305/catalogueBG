"use client";

import { useEffect, useRef, useState } from "react";
import { WizardFabricMockupStep } from "@/components/admin/WizardFabricMockupStep";
import { WizardMockupCategoryStep } from "@/components/admin/WizardMockupCategoryStep";
import { useI18n } from "@/components/i18n/I18n";
import { listMockupTemplatesAction, publishCatalogDesignEntryAction } from "@/lib/actions";
import { hasSavedCatalogMockup } from "@/lib/catalog";
import { FABRIC_PRODUCT } from "@/lib/mockup/constants";
import type { MockupSaveStep } from "@/lib/mockup/clientRender";
import { useMockupJobs } from "@/lib/useMockupJobs";
import { runAdminAction } from "@/lib/runAdminAction";
import type { Fabric, Mockup, Template } from "@/types";

export function CatalogDesignMockups({
  slug,
  fabric,
  onChange,
}: {
  slug: string;
  fabric: Fabric;
  onChange: (fabric: Fabric) => void;
}) {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<Template[]>([]);
  const fabricRef = useRef(fabric);
  fabricRef.current = fabric;
  const jobs = useMockupJobs(fabricRef, (value) => {
    const next = typeof value === "function" ? value(fabricRef.current) : value;
    fabricRef.current = next;
    onChange(next);
  }, templates);

  useEffect(() => {
    void runAdminAction(t, () => listMockupTemplatesAction()).then((result) => {
      if (result && result.ok && "templates" in result) setTemplates(result.templates);
    });
  }, [t]);

  function patch(partial: Partial<Fabric>) {
    const next = { ...fabricRef.current, ...partial };
    fabricRef.current = next;
    onChange(next);
  }

  function choose(productType: string, template: Template, selected: boolean) {
    const current = fabricRef.current;
    const mockups = current.mockups.filter((item) => !(item.templateId === template.id && item.productType === productType));
    if (selected) {
      const created: Mockup = {
        productType,
        templateId: template.id,
        url: template.thumbnailUrl,
        thumbUrl: template.thumbnailUrl,
        isPrimary: productType === FABRIC_PRODUCT && !mockups.some((item) => item.productType === FABRIC_PRODUCT && item.isPrimary),
        sameForAllAreas: true,
        areas: template.areas.map((area) => ({ areaId: area.id, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })),
        engine: template.engine,
        generatedAt: new Date().toISOString(),
      };
      mockups.push(created);
    }
    const next = { ...current, mockups };
    fabricRef.current = next;
    onChange(next);
  }

  async function saveMockup(slot: Pick<Mockup, "templateId" | "productType">, onProgress?: (step: MockupSaveStep) => void, signal?: AbortSignal) {
    const count = await jobs.run(slot, {
      onPersisted: (saved) => {
        onChange({ ...saved, persisted: true });
      },
      onProgress,
      signal,
    });
    const ready = hasSavedCatalogMockup(fabricRef.current);
    if (count > 0 && ready && fabricRef.current.status !== "published") {
      const published = await runAdminAction(t, () => publishCatalogDesignEntryAction(fabricRef.current.id, slug));
      if (published && published.ok && "fabric" in published) onChange({ ...published.fabric, persisted: true });
    }
    return count;
  }

  return (
    <div className="space-y-3">
      {hasSavedCatalogMockup(fabric) ? null : <p className="text-sm text-amber-800">{t("catalogs.noMockup")}</p>}
      <WizardFabricMockupStep fabric={fabric} templates={templates} onChange={patch} onChoose={choose} onSaveMockup={saveMockup} />
      <WizardMockupCategoryStep fabric={fabric} templates={templates} onChange={patch} onChoose={choose} onSaveMockup={saveMockup} />
    </div>
  );
}
