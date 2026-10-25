"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { loadImage, renderMockup } from "@/components/mockup/MockupRenderer";
import { fillPlan, fillPlanKey, mockupOptions } from "@/lib/mockup/fill";
import { renderPreview } from "@/lib/mockup/previewClient";
import type { Fabric, Mockup, Template } from "@/types";

const DEBOUNCE_MS = 120;

/** Draws the mockup preview into the canvas; returns the renderer's own error text (Russian) to show in the form. */
export function useMockupPreview(canvas: RefObject<HTMLCanvasElement | null>, fabric: Fabric, template: Template, mockup: Mockup) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);
  const isUvgrid = template.engine === "uvgrid" && Boolean(template.baked.jsonUrl);
  const plan = fillPlan(fabric);
  const drawKey = JSON.stringify([fillPlanKey(plan), mockup.areas, mockup.sameForAllAreas, template.id, template.baked.jsonUrl, template.baked.backgroundUrl]);

  useEffect(() => {
    const node = canvas.current;
    if (!node || !plan) return;
    const ticket = latest.current + 1;
    latest.current = ticket;
    const timer = window.setTimeout(() => {
      setBusy(true);
      const job = isUvgrid ? drawUvgrid(node, template, plan, mockup) : drawWebgl(node, fabric, template, mockup);
      job
        .then(() => {
          if (latest.current === ticket) setError(null);
        })
        .catch((reason: unknown) => {
          if (latest.current === ticket) setError(reason instanceof Error ? reason.message : String(reason));
        })
        .finally(() => {
          if (latest.current === ticket) setBusy(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw only when the inputs in drawKey change, not on every new fabric object from the server
  }, [drawKey, isUvgrid]);

  return { error, busy, isUvgrid };
}

async function drawUvgrid(node: HTMLCanvasElement, template: Template, plan: NonNullable<ReturnType<typeof fillPlan>>, mockup: Mockup) {
  const image = await renderPreview({ jsonUrl: template.baked.jsonUrl, backgroundUrl: template.baked.backgroundUrl, plan, opts: mockupOptions(mockup) });
  node.width = image.width;
  node.height = image.height;
  node.getContext("2d")?.putImageData(image, 0, 0);
}

async function drawWebgl(node: HTMLCanvasElement, fabric: Fabric, template: Template, mockup: Mockup) {
  if (!fabric.design.webUrl) return;
  const pattern = await loadImage(fabric.design.webUrl);
  const background = template.baked.backgroundUrl ? await loadImage(template.baked.backgroundUrl).catch(() => null) : null;
  const overlays = await Promise.all(template.baked.overlays.map(async (overlay) => ({ ...overlay, image: await loadImage(overlay.url) })));
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
