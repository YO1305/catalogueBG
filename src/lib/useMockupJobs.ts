"use client";

import { useCallback, useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { saveFabricAction } from "@/lib/actions";
import { renderAndSave } from "@/lib/mockup/clientRender";
import { placeMockup } from "@/lib/variants";
import type { Fabric, Mockup, Template } from "@/types";

export type MockupProgress = { done: number; total: number };

type Slot = Pick<Mockup, "templateId" | "productType">;

const sameSlot = (a: Slot, b: Slot) => a.templateId === b.templateId && a.productType === b.productType;

type RunOptions = { onPersisted?: (fabric: Fabric) => void };

function areasKey(mockup: Mockup): string {
  return JSON.stringify({
    same: mockup.sameForAllAreas,
    areas: mockup.areas.map((a) => [a.areaId, Number(a.scale.toFixed(3)), Number(a.offsetX.toFixed(2)), Number(a.offsetY.toFixed(2)), Math.round(a.rotation ?? 0)]),
  });
}

function existingMockup(fabric: Fabric, slot: Slot, variantId?: string): Mockup | undefined {
  const list = variantId ? fabric.variants?.find((item) => item.id === variantId)?.mockups : fabric.mockups;
  return list?.find((item) => sameSlot(item, slot));
}

/** Skip only *other* colourways on publish — never skip the slot the user just clicked. */
function skipOnPublish(fabric: Fabric, mockup: Mockup, variantId: string | undefined, clicked: Slot | undefined): boolean {
  if (clicked && !variantId && sameSlot(mockup, clicked)) return false;
  const saved = existingMockup(fabric, mockup, variantId);
  if (!saved?.webUrl && !saved?.url) return false;
  return areasKey(saved) === areasKey(mockup);
}

export function useMockupJobs(fabricRef: MutableRefObject<Fabric>, setFabric: Dispatch<SetStateAction<Fabric>>, templates: Template[]) {
  const [progress, setProgress] = useState<MockupProgress | null>(null);

  useEffect(() => {
    if (!progress) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [progress]);

  const run = useCallback(
    async (only?: Slot, options?: RunOptions) => {
      const snapshot = fabricRef.current;
      const mockups = snapshot.mockups.filter((item) => !only || sameSlot(item, only));
      const woven = Boolean(snapshot.woven || snapshot.kind === "woven");
      const variantIds = only
        ? []
        : (snapshot.variants ?? [])
            .filter((item) => item.design.webUrl || (woven && (item.weaveColor || item.mockups.some((m) => m.webUrl || m.url))))
            .map((item) => item.id);
      const candidates = [undefined, ...variantIds].flatMap((variantId) => mockups.map((mockup) => ({ variantId, mockup })));
      const jobs = only ? candidates : candidates.filter((job) => !skipOnPublish(snapshot, job.mockup, job.variantId, only));
      if (!jobs.length) return 0;

      setProgress({ done: 0, total: jobs.length });
      try {
        const alreadyOnServer = Boolean(snapshot.id && snapshot.art);
        if (!alreadyOnServer) {
          const status = snapshot.status === "published" ? "published" : "draft";
          const savedOnce = await saveFabricAction({ ...fabricRef.current, status });
          if (!savedOnce.ok) throw new Error("Сохраните черновик перед сохранением макетов");
          fabricRef.current = savedOnce.fabric;
        }
        for (const [index, job] of jobs.entries()) {
          const live = fabricRef.current.mockups.find((item) => sameSlot(item, job.mockup)) ?? job.mockup;
          const template = templates.find((item) => item.id === live.templateId);
          if (template) {
            const { mockup: saved } = await renderAndSave(fabricRef.current, template, live, job.variantId, {
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
    },
    [fabricRef, setFabric, templates],
  );

  return { progress, run };
}
