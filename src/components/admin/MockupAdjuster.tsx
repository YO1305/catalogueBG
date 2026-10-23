"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SCALE_PRESETS, scaleToSlider, sliderToScale } from "@/lib/mockupMath";
import { loadImage, renderMockup } from "@/components/mockup/MockupRenderer";
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
  const areaId = mockup.sameForAllAreas ? "all" : mockup.areas[0]?.areaId ?? template.areas[0]?.id ?? "all";
  const setting = mockup.areas.find((item) => item.areaId === (mockup.sameForAllAreas ? mockup.areas[0]?.areaId : areaId)) ?? mockup.areas[0];
  const scale = setting?.scale ?? 1;

  useEffect(() => {
    const node = canvas.current;
    if (!node || !fabric.design.webUrl) return;
    let cancel = false;
    void (async () => {
      const pattern = await loadImage(fabric.design.webUrl);
      const background = template.baked.backgroundUrl ? await loadImage(template.baked.backgroundUrl).catch(() => null) : null;
      const overlays = await Promise.all(template.baked.overlays.map(async (overlay) => ({ ...overlay, image: await loadImage(overlay.url) })));
      if (cancel) return;
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
    })();
    return () => {
      cancel = true;
    };
  }, [fabric.design.webUrl, fabric.rapport, mockup, template]);

  function patch(partial: Partial<NonNullable<typeof setting>>, all = mockup.sameForAllAreas) {
    const areas = (all ? template.areas : template.areas.filter((area) => area.id === areaId)).map((area) => ({
      areaId: area.id,
      scale: partial.scale ?? setting?.scale ?? 1,
      offsetX: partial.offsetX ?? setting?.offsetX ?? 0,
      offsetY: partial.offsetY ?? setting?.offsetY ?? 0,
      rotation: partial.rotation ?? setting?.rotation ?? 0,
    }));
    const merged = template.areas.map((area) => areas.find((item) => item.areaId === area.id) ?? mockup.areas.find((item) => item.areaId === area.id) ?? { areaId: area.id, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 });
    onChange({ ...mockup, sameForAllAreas: all, areas: merged });
  }

  return (
    <div className="border border-ink/10 bg-white p-3">
      <p className="text-sm font-medium">{template.name}</p>
      <canvas
        ref={canvas}
        className="mt-2 w-full cursor-grab bg-sand"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, ox: setting?.offsetX ?? 0, oy: setting?.offsetY ?? 0 };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          patch({ offsetX: drag.current.ox + event.clientX - drag.current.x, offsetY: drag.current.oy + event.clientY - drag.current.y });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      />
      <label className="mt-3 block text-xs uppercase text-ink/50">{t("wizard.zone")}</label>
      <select className="h-10 w-full border border-ink/15 bg-white px-2 text-sm" value={mockup.sameForAllAreas ? "all" : areaId} onChange={(event) => patch({}, event.target.value === "all")}>
        <option value="all">{t("wizard.allZones")}</option>
        {template.areas.map((area) => (
          <option key={area.id} value={area.id}>{area.label}</option>
        ))}
      </select>
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
      </div>
    </div>
  );
}
