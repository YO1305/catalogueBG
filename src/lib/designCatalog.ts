import type { Fabric, FabricDesign } from "@/types";

export function isPrivateDesignUrl(url: string) {
  return url.includes("/private/designs/");
}

/** Public payload for a design catalogue: 2000px WebP, never the original or the 4000px master. */
export function designCatalogPublicDesign(design: FabricDesign): FabricDesign {
  const view = design.viewUrl && !isPrivateDesignUrl(design.viewUrl) ? design.viewUrl : "";
  const thumb = design.thumbUrl && !isPrivateDesignUrl(design.thumbUrl) ? design.thumbUrl : "";
  const src = view || thumb || design.thumbUrl || "";
  return {
    ...design,
    originalUrl: "",
    webUrl: src,
    thumbUrl: thumb || src,
    viewUrl: view || undefined,
  };
}

export function designNumber(fabric: Pick<Fabric, "art" | "name">) {
  return fabric.art.trim() || fabric.name.ru;
}

export function designWidthCm(fabric: Pick<Fabric, "width">) {
  return fabric.width.trim();
}
