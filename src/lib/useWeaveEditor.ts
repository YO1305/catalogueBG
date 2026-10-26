"use client";

import type { RefObject } from "react";
import { toast } from "sonner";
import { autoFabricColor } from "@/lib/mockup/fabricColor";
import { defaultWeave } from "@/lib/mockup/weave";
import type { Fabric, FabricWeave } from "@/types";

type Upload = (file: File) => Promise<{ webUrl: string } | null>;

/** Woven fabric: reference photo for colour only; catalogue shows saved product mockups. */
export function useWeaveEditor(
  fabricRef: RefObject<Fabric>,
  update: (partial: Partial<Fabric>) => void,
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

  async function uploadMap(file: File) {
    const data = await uploadDesign(file);
    if (data) patchWeave({ pattern: "map", mapUrl: data.webUrl, mapWidthCm: fabricRef.current.weave?.mapWidthCm || 10 });
  }

  return { patchWeave, autoColor, uploadMap };
}
