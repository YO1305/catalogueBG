"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { abortRenderers } from "@/lib/mockup/previewClient";
import type { MockupSaveStep } from "@/lib/mockup/clientRender";
import { useMockupPreview } from "@/lib/mockup/useMockupPreview";
import { SCALE_PRESETS, scaleToSlider, sliderToScale } from "@/lib/mockupMath";
import type { Fabric, Mockup, Template } from "@/types";

function stepLabel(t: (key: string, vars?: Record<string, string | number>) => string, step: MockupSaveStep | null, saving: boolean) {
  if (!saving) return t("templates.rebuildOne");
  if (step === "render") return t("designs.mockupStepRender");
  if (step === "upload1") return t("designs.mockupStepUpload", { n: 1 });
  if (step === "upload2") return t("designs.mockupStepUpload", { n: 2 });
  if (step === "save") return t("designs.mockupStepSave");
  return t("designs.mockupSaving");
}

export function MockupAdjuster({
  fabric,
  template,
  mockup,
  onChange,
  onSave,
}: {
  fabric: Fabric;
  template: Template;
  mockup: Mockup;
  onChange: (mockup: Mockup, opts?: { silent?: boolean }) => void;
  onSave: (onProgress?: (step: MockupSaveStep) => void, signal?: AbortSignal) => Promise<number>;
}) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<MockupSaveStep | null>(null);
  const preview = useMockupPreview(canvas, fabric, template, mockup);
  const { isUvgrid } = preview;
  const areaId = mockup.sameForAllAreas ? "all" : mockup.areas[0]?.areaId ?? template.areas[0]?.id ?? "all";
  const setting = mockup.areas.find((item) => item.areaId === (mockup.sameForAllAreas ? mockup.areas[0]?.areaId : areaId)) ?? mockup.areas[0];
  const scale = setting?.scale ?? 1;
  const rotation = setting?.rotation ?? 0;

  function patch(partial: Partial<NonNullable<typeof setting>>, all = mockup.sameForAllAreas, silent = false) {
    const areas = (all ? template.areas : template.areas.filter((area) => area.id === areaId)).map((area) => ({
      areaId: area.id,
      scale: partial.scale ?? setting?.scale ?? 1,
      offsetX: partial.offsetX ?? setting?.offsetX ?? 0,
      offsetY: partial.offsetY ?? setting?.offsetY ?? 0,
      rotation: partial.rotation ?? setting?.rotation ?? 0,
    }));
    const merged = template.areas.map(
      (area) =>
        areas.find((item) => item.areaId === area.id) ??
        mockup.areas.find((item) => item.areaId === area.id) ?? { areaId: area.id, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    );
    onChange({ ...mockup, sameForAllAreas: all, areas: merged }, { silent });
  }

  async function saveWebp() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStep("render");
    setSaveError(null);
    const controller = new AbortController();
    try {
      await onSave(setStep, controller.signal);
      toast(t("designs.mockupSaved"));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") abortRenderers();
      const message =
        error instanceof Error && error.name === "AbortError"
          ? t("designs.mockupTimeout")
          : error instanceof Error
            ? error.message
            : String(error);
      setSaveError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
      setStep(null);
    }
  }

  return (
    <div className="border border-ink/10 bg-white p-3">
      <p className="text-sm font-medium">{template.name}</p>
      {!isUvgrid ? (
        <p className="mt-2 text-sm text-ink/60">{t("wizard.mockupNeedsUvgrid")}</p>
      ) : preview.error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {t("wizard.mockupPreviewError")}
          <span className="mt-1 block font-mono text-xs">{preview.error}</span>
        </p>
      ) : null}
      {saveError ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {t("wizard.mockupSaveError")}
          <span className="mt-1 block font-mono text-xs">{saveError}</span>
        </p>
      ) : null}
      {preview.busy ? <p className="mt-2 text-xs text-ink/50">{t("wizard.previewRendering")}</p> : null}
      <canvas
        ref={canvas}
        className="mt-2 w-full cursor-grab bg-sand"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, ox: setting?.offsetX ?? 0, oy: setting?.offsetY ?? 0 };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const pxPerCm = template.areas.find((a) => a.id === (mockup.sameForAllAreas ? template.areas[0]?.id : areaId))?.pxPerCm ?? 5;
          const cmPerPx = template.source.widthPx / (canvas.current?.clientWidth ?? 1000) / pxPerCm;
          patch({
            offsetX: drag.current.ox + (event.clientX - drag.current.x) * cmPerPx,
            offsetY: drag.current.oy + (event.clientY - drag.current.y) * cmPerPx,
          }, mockup.sameForAllAreas, true);
        }}
        onPointerUp={() => {
          drag.current = null;
          onChange({ ...mockup });
        }}
      />
      <label className="mt-3 block text-xs uppercase text-ink/50">{t("wizard.zone")}</label>
      <Select value={mockup.sameForAllAreas ? "all" : areaId} onChange={(event) => patch({}, event.target.value === "all")}>
        <option value="all">{t("wizard.allZones")}</option>
        {template.areas.map((area) => (
          <option key={area.id} value={area.id}>{area.label}</option>
        ))}
      </Select>
      <label className="mt-3 block text-xs uppercase text-ink/50">{t("wizard.scale")}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs">×0.1</span>
        <input
          className="flex-1"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={scaleToSlider(scale)}
          onChange={(event) => patch({ scale: sliderToScale(Number(event.target.value)) }, mockup.sameForAllAreas, true)}
          onPointerUp={() => onChange({ ...mockup })}
        />
        <span className="text-xs">×10</span>
        <Input className="w-20" type="number" min={0.1} max={10} step={0.05} value={scale} onChange={(event) => patch({ scale: Number(event.target.value) })} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {SCALE_PRESETS.map((preset) => (
          <Button key={preset} type="button" size="sm" variant="outline" onClick={() => patch({ scale: preset })}>{`×${preset}`}</Button>
        ))}
      </div>
      <label className="mt-3 block text-xs uppercase text-ink/50">{t("wizard.rotation")}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs">0°</span>
        <input
          className="flex-1"
          type="range"
          min={0}
          max={360}
          step={1}
          value={rotation}
          onChange={(event) => patch({ rotation: Number(event.target.value) }, mockup.sameForAllAreas, true)}
          onPointerUp={() => onChange({ ...mockup })}
        />
        <span className="text-xs">360°</span>
        <Input
          className="w-20"
          type="number"
          min={0}
          max={360}
          step={1}
          value={rotation}
          onChange={(event) => patch({ rotation: Number(event.target.value) })}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[0, 45, 90, 180].map((degrees) => (
          <Button key={degrees} type="button" size="sm" variant="outline" onClick={() => patch({ rotation: degrees })}>{`${degrees}°`}</Button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => patch({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })}>{t("wizard.resetReal")}</Button>
        <Button type="button" size="sm" disabled={saving} aria-busy={saving} onClick={() => void saveWebp()}>
          {stepLabel(t, step, saving)}
        </Button>
      </div>
    </div>
  );
}
