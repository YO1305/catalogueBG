"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { renderMockup } from "@/components/mockup/MockupRenderer";
import { loadImage as loadWebglImage } from "@/components/mockup/MockupRenderer";
import { buildStripeFabricInput, fabricUsesStripes } from "@/lib/uvgrid/buildFabricInput";
import { patternPreview, templatePreview } from "@/lib/uvgrid/previewCache";
import { renderUvgridToCanvas } from "@/lib/uvgrid/render";
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
  const renderTimer = useRef<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const areaId = mockup.sameForAllAreas ? "all" : mockup.areas[0]?.areaId ?? template.areas[0]?.id ?? "all";
  const setting = mockup.areas.find((item) => item.areaId === (mockup.sameForAllAreas ? mockup.areas[0]?.areaId : areaId)) ?? mockup.areas[0];
  const scale = setting?.scale ?? 1;
  const isUvgrid = template.engine === "uvgrid" && Boolean(template.baked.jsonUrl);
  const useStripes = fabricUsesStripes(fabric, template);
  const drawKey = JSON.stringify([
    fabric.design.webUrl,
    fabric.designMode,
    fabric.stripes,
    fabric.rapport,
    mockup.areas,
    mockup.sameForAllAreas,
    template.id,
    template.baked.jsonUrl,
    template.baked.backgroundUrl,
  ]);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let cancel = false;

    function scheduleRender() {
      if (renderTimer.current) window.clearTimeout(renderTimer.current);
      renderTimer.current = window.setTimeout(() => {
        void draw();
      }, 120);
    }

    async function draw() {
      if (cancel || !node) return;
      if (isUvgrid) {
        if (!useStripes && !fabric.design.webUrl) return;
        try {
          const [preview, pattern] = await Promise.all([
            templatePreview(template.baked.jsonUrl, template.baked.backgroundUrl),
            useStripes ? Promise.resolve(null) : patternPreview(fabric.design.webUrl),
          ]);
          const fabricInput = pattern
            ? {
                ...pattern,
                mode: "pattern" as const,
                rapportWidthCm: fabric.rapport.widthCm || 8,
                rapportHeightCm: fabric.rapport.heightCm || fabric.rapport.widthCm || 8,
              }
            : buildStripeFabricInput(fabric);
          if (cancel || !node) return;
          renderUvgridToCanvas(node, {
            manifest: preview.manifest,
            width: preview.width,
            height: preview.height,
            background: preview.background,
            zones: preview.zones,
            fabric: fabricInput,
            settings: mockup.areas.map((area) => ({
              areaId: area.areaId,
              scale: area.scale,
              offsetX: area.offsetX,
              offsetY: area.offsetY,
              rotation: area.rotation,
            })),
            sameForAllAreas: mockup.sameForAllAreas,
          });
          if (!cancel) setPreviewError(null);
        } catch (error) {
          if (cancel) return;
          setPreviewError(error instanceof Error ? error.message : "preview_failed");
        }
        return;
      }
      if (!fabric.design.webUrl) return;
      const pattern = await loadWebglImage(fabric.design.webUrl);
      const background = template.baked.backgroundUrl ? await loadWebglImage(template.baked.backgroundUrl).catch(() => null) : null;
      const overlays = await Promise.all(template.baked.overlays.map(async (overlay) => ({ ...overlay, image: await loadWebglImage(overlay.url) })));
      if (cancel || !node) return;
      const width = 1000;
      const height = Math.max(200, Math.round((width * template.source.heightPx) / Math.max(template.source.widthPx, 1)));
      renderMockup(node, {
        width,
        height,
        background,
        pattern,
        overlays,
        areas: template.areas,
        settings: mockup.areas,
        rapport: fabric.rapport,
        sameForAllAreas: mockup.sameForAllAreas,
      });
    }

    scheduleRender();
    return () => {
      cancel = true;
      if (renderTimer.current) window.clearTimeout(renderTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw only when the inputs in drawKey change, not on every new fabric object from the server
  }, [drawKey, isUvgrid, useStripes]);

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
        </p>
      ) : null}
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
                  setPreviewError(data.error ?? "render_failed");
                  return;
                }
                setPreviewError(null);
                const row = data.fabrics?.find((item) => item.fabricId === fabric.id);
                const saved = row?.mockups.find((item) => item.templateId === template.id && item.productType === mockup.productType);
                if (saved) onChange(saved);
              })
              .catch(() => setPreviewError("render_failed"))
              .finally(() => setSaving(false));
          }}
        >
          {t("templates.rebuildOne")}
        </Button>
      </div>
    </div>
  );
}
