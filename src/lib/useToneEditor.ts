"use client";

import type { RefObject } from "react";
import { autoFabricColor } from "@/lib/mockup/fabricColor";
import { DEFAULT_CORRECTION, defaultWeave } from "@/lib/mockup/weave";
import { toneVariant } from "@/lib/variants";
import type { Fabric, FabricDesign, FabricVariant, Tone } from "@/types";

type Upload = (file: File) => Promise<{ webUrl: string; thumbUrl: string; originalUrl: string; widthPx: number; heightPx: number } | null>;

/** Dyed fabrics: light and dark tones are colourways tied to a tone; medium is the main picture. */
export function useToneEditor(
  fabricRef: RefObject<Fabric>,
  update: (partial: Partial<Fabric>, opts?: { silent?: boolean }) => void,
  uploadDesign: Upload,
) {
  function patchTone(tone: Exclude<Tone, "medium">, partial: Partial<FabricVariant>, opts?: { silent?: boolean }) {
    const current = fabricRef.current;
    const existing = toneVariant(current, tone);
    const variants = existing
      ? (current.variants ?? []).map((item) => (item.id === existing.id ? { ...item, ...partial } : item))
      : [...(current.variants ?? []), { id: crypto.randomUUID(), name: "", tone, mockups: [], design: current.design, ...partial }];
    update({ variants }, opts);
  }

  async function uploadTone(tone: Exclude<Tone, "medium">, file: File) {
    const data = await uploadDesign(file);
    if (!data) return;
    const current = fabricRef.current;
    const design: FabricDesign = { ...data, seamless: current.design.seamless };
    patchTone(tone, { design, mockups: [] });
    const weaveColor = await pick(data.webUrl);
    if (weaveColor) patchTone(tone, { weaveColor });
  }

  function pick(url: string) {
    return autoFabricColor(url, fabricRef.current.weave?.correction ?? DEFAULT_CORRECTION).catch(() => undefined);
  }

  /** Dyed fabrics from before the colour was taken from the photo get it once, so their mockups are solid colour. */
  async function fillMissingColors() {
    const current = fabricRef.current;
    if (!current.toned) return;
    if (!current.weave?.color && current.design.webUrl) {
      const color = await pick(current.design.webUrl);
      if (color) update({ weave: { ...(fabricRef.current.weave ?? defaultWeave()), pattern: "none", color } }, { silent: true });
    }
    for (const tone of ["light", "dark"] as const) {
      const variant = toneVariant(fabricRef.current, tone);
      if (!variant?.design.webUrl || variant.weaveColor) continue;
      const weaveColor = await pick(variant.design.webUrl);
      if (weaveColor) patchTone(tone, { weaveColor }, { silent: true });
    }
  }

  return { uploadTone, patchTone, fillMissingColors };
}
