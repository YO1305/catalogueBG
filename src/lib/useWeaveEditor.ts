"use client";

import type { RefObject } from "react";
import { toast } from "sonner";
import { autoFabricColor } from "@/lib/mockup/fabricColor";
import { defaultWeave, templateFitsFabric } from "@/lib/mockup/weave";
import type { Fabric, FabricWeave, Template } from "@/types";

type Upload = (file: File) => Promise<{ webUrl: string } | null>;

/** Woven-fabric part of the design form: the photo goes to the catalogue, mockups get one colour plus the weave. */
export function useWeaveEditor(
  fabricRef: RefObject<Fabric>,
  update: (partial: Partial<Fabric>) => void,
  templates: Template[],
  uploadDesign: Upload,
) {
  function patchWeave(partial: Partial<FabricWeave>) {
    const current = fabricRef.current;
    update({ weave: { ...(current.weave ?? defaultWeave()), ...partial } });
  }

  async function autoColor(url = fabricRef.current.design.webUrl) {
    if (!url) return;
    const correction = fabricRef.current.weave?.correction ?? defaultWeave().correction;
    try {
      patchWeave({ color: await autoFabricColor(url, correction), correction });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error));
    }
  }

  function setWoven(on: boolean) {
    const current = fabricRef.current;
    const fits = (templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      return Boolean(template && templateFitsFabric({ woven: true }, template));
    };
    update({
      woven: on,
      weave: on ? current.weave ?? defaultWeave() : current.weave,
      mockups: on ? current.mockups.filter((item) => fits(item.templateId)) : current.mockups,
    });
    if (on && !current.weave && current.design.webUrl) void autoColor(current.design.webUrl);
  }

  async function uploadMap(file: File) {
    const data = await uploadDesign(file);
    if (data) patchWeave({ pattern: "map", mapUrl: data.webUrl, mapWidthCm: fabricRef.current.weave?.mapWidthCm || 10 });
  }

  return { patchWeave, autoColor, setWoven, uploadMap };
}
