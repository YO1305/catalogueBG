"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useMockupPreview } from "@/lib/mockup/useMockupPreview";
import { SCALE_PRESETS, scaleToSlider, sliderToScale } from "@/lib/mockupMath";
import type { Fabric, Mockup, Template } from "@/types";

export function MockupAdjuster({
  fabric,
  template,
  mockup,
  onChange,
}: {
  fabric: Fabric;
  template: Template;
  mockup: Mockup;
  onChange: (mockup: Mockup) => void;
}) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const preview = useMockupPreview(canvas, fabric, template, mockup);
  const { isUvgrid } = preview;
  const previewError = saveError ?? preview.error;
  const areaId = mockup.sameForAllAreas ? "all" : mockup.areas[0]?.areaId ?? template.areas[0]?.id ?? "all";
  const setting = mockup.areas.find((item) => item.areaId === (mockup.sameForAllAreas ? mockup.areas[0]?.areaId : areaId)) ?? mockup.areas[0];
  const scale = setting?.scale ?? 1;

  function patch(partial: Partial<NonNullable<typeof setting>>, all = mockup.sameForAllAreas) {
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
    onChange({ ...mockup, sameForAllAreas: all, areas: merged });
  }

  return (
    <div className="border border-ink/10 bg-white p-3">
      <p className="text-sm font-medium">{template.name}</p>
      {previewError ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {t("wizard.mockupPreviewError")}
          <span className="mt-1 block font-mono text-xs">{previewError}</span>
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
          if (isUvgrid) {
            const node = canvas.current;
            const pxPerCm = template.areas.find((a) => a.id === (mockup.sameForAllAreas ? template.areas[0]?.id : areaId))?.pxPerCm ?? 5;
            const clientW = node?.clientWidth ?? 1000;
            const cmPerPx = template.source.widthPx / clientW / pxPerCm;
            const dx = (event.clientX - drag.current.x) * cmPerPx;
            const dy = (event.clientY - drag.current.y) * cmPerPx;
            patch({ offsetX: drag.current.ox + dx, offsetY: drag.current.oy + dy });
            return;
          }
          patch({ offsetX: drag.current.ox + event.clientX - drag.current.x, offsetY: drag.current.oy + event.clientY - drag.current.y });
        }}
        onPointerUp={() => {
          drag.current = null;
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
        <input className="flex-1" type="range" min={0} max={1} step={0.001} value={scaleToSlider(scale)} onChange={(event) => patch({ scale: sliderToScale(Number(event.target.value)) })} />
        <span className="text-xs">×10</span>
        <Input className="w-20" type="number" min={0.1} max={10} step={0.05} value={scale} onChange={(event) => patch({ scale: Number(event.target.value) })} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {SCALE_PRESETS.map((preset) => (
          <Button key={preset} type="button" size="sm" variant="outline" onClick={() => patch({ scale: preset })}>{`×${preset}`}</Button>
        ))}
        {[0, 45, 90].map((degrees) => (
          <Button key={degrees} type="button" size="sm" variant="outline" onClick={() => patch({ rotation: degrees })}>{`${degrees}°`}</Button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => patch({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })}>{t("wizard.resetReal")}</Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => {
            setSaving(true);
            void fetch("/api/mockups/render", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ fabricId: fabric.id, templateId: template.id }),
            })
              .then(async (response) => {
                const data = (await response.json()) as {
                  ok?: boolean;
                  error?: string;
                  fabrics?: { fabricId: string; mockups: Mockup[] }[];
                };
                if (!response.ok || !data.ok) {
                  setSaveError(data.error ?? "render_failed");
                  return;
                }
                setSaveError(null);
                const row = data.fabrics?.find((item) => item.fabricId === fabric.id);
                const saved = row?.mockups.find((item) => item.templateId === template.id && item.productType === mockup.productType);
                if (saved) onChange(saved);
              })
              .catch(() => setSaveError("render_failed"))
              .finally(() => setSaving(false));
          }}
        >
          {t("templates.rebuildOne")}
        </Button>
      </div>
    </div>
  );
}
