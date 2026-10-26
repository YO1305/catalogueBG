import { fabricKind } from "@/lib/fabricKind";
import type { Catalog, Fabric, FabricDesign } from "@/types";

function stripDesign(design: FabricDesign): FabricDesign {
  return { ...design, webUrl: "", thumbUrl: "", originalUrl: "" };
}

/** Убирает URL плоского рисунка из данных, уходящих на публичную страницу каталога (SPEC 5.8.5). */
export function sanitizePublicFabric(fabric: Fabric, catalog: Catalog): Fabric {
  if (catalog.showFlatDesign) return fabric;
  if (fabricKind(fabric) !== "printed") return fabric;
  return {
    ...fabric,
    design: stripDesign(fabric.design),
    variants: fabric.variants?.map((variant) => ({ ...variant, design: stripDesign(variant.design) })),
  };
}
