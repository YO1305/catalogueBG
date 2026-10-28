import { hasSavedCatalogMockup, primaryFabricMockup } from "@/lib/catalog";
import { defaultWeave } from "@/lib/mockup/weave";
import { missingTones } from "@/lib/variants";
import type { Fabric, FabricKind } from "@/types";

export const FABRIC_KINDS: FabricKind[] = ["woven", "dyed", "printed"];

export function isFabricKind(value: unknown): value is FabricKind {
  return typeof value === "string" && (FABRIC_KINDS as string[]).includes(value);
}

/** Older records have no kind: the woven checkbox and the «Крашение» finish decide. */
export function fabricKind(fabric: Pick<Fabric, "kind" | "woven" | "toned">): FabricKind {
  if (fabric.kind) return fabric.kind;
  if (fabric.woven) return "woven";
  if (fabric.toned) return "dyed";
  return "printed";
}

/** The flags the renderer and the catalogue read, kept in step with the section. */
export function kindFields(kind: FabricKind, fabric: Pick<Fabric, "weave">): Pick<Fabric, "kind" | "woven" | "toned" | "weave"> {
  if (kind === "printed") return { kind, woven: false, toned: false, weave: fabric.weave };
  const weave = fabric.weave ?? (kind === "dyed" ? { ...defaultWeave(), pattern: "none" as const } : defaultWeave());
  return { kind, woven: kind === "woven", toned: kind === "dyed", weave };
}

/** What the section needs before «Сохранить и опубликовать». */
export function kindReady(fabric: Fabric): boolean {
  const kind = fabricKind(fabric);
  if (!fabric.design.webUrl) return false;
  if (kind === "woven") {
    return Boolean(fabric.weave?.color && hasSavedCatalogMockup(fabric));
  }
  if (kind === "dyed") return !missingTones(fabric).length && Boolean(fabric.weave?.color);
  const hero = primaryFabricMockup(fabric);
  return fabric.rapport.widthCm > 0 && fabric.rapport.heightCm > 0 && Boolean(hero?.url || hero?.webUrl);
}
