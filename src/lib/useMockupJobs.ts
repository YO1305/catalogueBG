"use client";

import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { renderAndSave } from "@/lib/mockup/clientRender";
import { placeMockup } from "@/lib/variants";
import type { Fabric, Mockup, Template } from "@/types";

export type MockupProgress = { done: number; total: number };

type Slot = Pick<Mockup, "templateId" | "productType">;

const sameSlot = (a: Slot, b: Slot) => a.templateId === b.templateId && a.productType === b.productType;

type RunOptions = { onPersisted?: (fabric: Fabric) => void };

/** Mockups are rendered in this tab, so leaving the page before they finish would leave tones without photos. */
export function useMockupJobs(fabricRef: MutableRefObject<Fabric>, setFabric: Dispatch<SetStateAction<Fabric>>, templates: Template[]) {
  const [progress, setProgress] = useState<MockupProgress | null>(null);

  useEffect(() => {
    if (!progress) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [progress]);

  /** Main picture and every colourway / tone; `only` limits it to one mockup slot. Throws the first error. */
  async function run(only?: Slot, options?: RunOptions) {
    const snapshot = fabricRef.current;
    const mockups = snapshot.mockups.filter((item) => !only || sameSlot(item, only));
    const woven = Boolean(snapshot.woven || snapshot.kind === "woven");
    const variantIds = (snapshot.variants ?? [])
      .filter((item) => item.design.webUrl || (woven && (item.weaveColor || item.mockups.some((m) => m.webUrl || m.url))))
      .map((item) => item.id);
    const jobs = [undefined, ...variantIds].flatMap((variantId) => mockups.map((mockup) => ({ variantId, mockup })));
    if (!jobs.length) return 0;
    setProgress({ done: 0, total: jobs.length });
    try {
      for (const [index, job] of jobs.entries()) {
        const template = templates.find((item) => item.id === job.mockup.templateId);
        if (template) {
          const { mockup: saved, fabric: persisted } = await renderAndSave(fabricRef.current, template, job.mockup, job.variantId);
          options?.onPersisted?.(persisted);
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
