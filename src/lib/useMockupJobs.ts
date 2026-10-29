"use client";

import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { saveFabricAction } from "@/lib/actions";
import { renderAndSave } from "@/lib/mockup/clientRender";
import { placeMockup } from "@/lib/variants";
import type { Fabric, Mockup, Template } from "@/types";

export type MockupProgress = { done: number; total: number };

type Slot = Pick<Mockup, "templateId" | "productType">;

const sameSlot = (a: Slot, b: Slot) => a.templateId === b.templateId && a.productType === b.productType;

type RunOptions = { onPersisted?: (fabric: Fabric) => void; force?: boolean };

function areasKey(mockup: Mockup): string {
  return JSON.stringify({
    same: mockup.sameForAllAreas,
    areas: mockup.areas.map((a) => [a.areaId, a.scale, a.offsetX, a.offsetY, a.rotation ?? 0]),
  });
}

function existingMockup(fabric: Fabric, slot: Slot, variantId?: string): Mockup | undefined {
  const list = variantId ? fabric.variants?.find((item) => item.id === variantId)?.mockups : fabric.mockups;
  return list?.find((item) => sameSlot(item, slot));
}

/** True when a WebP already exists for this slot with the same crop/scale/rotation. */
function alreadyRendered(fabric: Fabric, mockup: Mockup, variantId?: string): boolean {
  const saved = existingMockup(fabric, mockup, variantId);
  if (!saved?.webUrl && !saved?.url) return false;
  return areasKey(saved) === areasKey(mockup);
}

/** Mockups are rendered in this tab, so leaving the page before they finish would leave tones without photos. */
export function useMockupJobs(fabricRef: MutableRefObject<Fabric>, setFabric: Dispatch<SetStateAction<Fabric>>, templates: Template[]) {
  const [progress, setProgress] = useState<MockupProgress | null>(null);

  useEffect(() => {
    if (!progress) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [progress]);

  /**
   * `only` = one template from the adjuster → main design only (fast, ~15s).
   * Full run (publish) = main + colourways, skipping slots that already match.
   */
  async function run(only?: Slot, options?: RunOptions) {
    const snapshot = fabricRef.current;
    const mockups = snapshot.mockups.filter((item) => !only || sameSlot(item, only));
    const woven = Boolean(snapshot.woven || snapshot.kind === "woven");
    // Adjuster save: only the main picture. Variants rebuild on publish if still missing.
    const variantIds = only
      ? []
      : (snapshot.variants ?? [])
          .filter((item) => item.design.webUrl || (woven && (item.weaveColor || item.mockups.some((m) => m.webUrl || m.url))))
          .map((item) => item.id);
    const candidates = [undefined, ...variantIds].flatMap((variantId) => mockups.map((mockup) => ({ variantId, mockup })));
    const jobs = options?.force
      ? candidates
      : candidates.filter((job) => !alreadyRendered(fabricRef.current, job.mockup, job.variantId));
    if (!jobs.length) return 0;
    setProgress({ done: 0, total: jobs.length });
    try {
      const status = snapshot.status === "published" ? "published" : "draft";
      const savedOnce = await saveFabricAction({ ...fabricRef.current, status });
      if (!savedOnce.ok) throw new Error("Сохраните черновик перед сохранением макетов");
      fabricRef.current = savedOnce.fabric;
      for (const [index, job] of jobs.entries()) {
        const template = templates.find((item) => item.id === job.mockup.templateId);
        if (template) {
          const { mockup: saved } = await renderAndSave(fabricRef.current, template, job.mockup, job.variantId, {
            persisted: fabricRef.current,
          });
          fabricRef.current = placeMockup(fabricRef.current, saved, job.variantId);
          options?.onPersisted?.(fabricRef.current);
          if (fabricRef.current.id === snapshot.id) {
            setFabric((current) => placeMockup(current, saved, job.variantId));
          }
        }
        setProgress({ done: index + 1, total: jobs.length });
      }
    } finally {
      setProgress(null);
    }
    return jobs.length;
  }

  return { progress, run };
}
