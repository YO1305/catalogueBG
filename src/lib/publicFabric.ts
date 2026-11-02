import type { Catalog, Fabric, FabricDesign } from "@/types";

function stripDesign(design: FabricDesign): FabricDesign {
  return { ...design, webUrl: "", thumbUrl: "", originalUrl: "", viewUrl: "" };
}

/** SPEC 5.8.5: плоский рисунок только в PIN-каталоге с showFlatDesign. */
export function publicFlatDesignAllowed(catalog: Pick<Catalog, "access" | "showFlatDesign">) {
  return catalog.access === "pin" && Boolean(catalog.showFlatDesign);
}

/** Убирает URL плоского рисунка из данных публичной страницы, JSON, PDF и OG. */
export function sanitizePublicFabric(fabric: Fabric, catalog: Pick<Catalog, "access" | "showFlatDesign">): Fabric {
  if (publicFlatDesignAllowed(catalog)) return fabric;
  return {
    ...fabric,
    design: stripDesign(fabric.design),
    variants: fabric.variants?.map((variant) => ({ ...variant, design: stripDesign(variant.design) })),
  };
}
