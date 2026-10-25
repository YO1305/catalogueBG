"use client";

import type { RefObject } from "react";
import { autoFabricColor } from "@/lib/mockup/fabricColor";
import { DEFAULT_CORRECTION } from "@/lib/mockup/weave";
import { toneVariant } from "@/lib/variants";
import type { Fabric, FabricDesign, FabricVariant, Tone } from "@/types";

type Upload = (file: File) => Promise<{ webUrl: string; thumbUrl: string; originalUrl: string; widthPx: number; heightPx: number } | null>;

/** Dyed fabrics: light and dark tones are colourways tied to a tone; medium is the main picture. */
export function useToneEditor(fabricRef: RefObject<Fabric>, update: (partial: Partial<Fabric>) => void, uploadDesign: Upload) {
  function patchTone(tone: Exclude<Tone, "medium">, partial: Partial<FabricVariant>) {
    const current = fabricRef.current;
    const existing = toneVariant(current, tone);
    const variants = existing
      ? (current.variants ?? []).map((item) => (item.id === existing.id ? { ...item, ...partial } : item))
      : [...(current.variants ?? []), { id: crypto.randomUUID(), name: "", tone, mockups: [], design: current.design, ...partial }];
    update({ variants });
  }

  async function uploadTone(tone: Exclude<Tone, "medium">, file: File) {
    const data = await uploadDesign(file);
    if (!data) return;
    const current = fabricRef.current;
    const design: FabricDesign = { ...data, seamless: current.design.seamless };
    patchTone(tone, { design, mockups: [] });
    if (!current.woven) return;
    const correction = current.weave?.correction ?? DEFAULT_CORRECTION;
    const weaveColor = await autoFabricColor(data.webUrl, correction).catch(() => undefined);
    if (weaveColor) patchTone(tone, { weaveColor });
  }

  return { uploadTone, patchTone };
}
