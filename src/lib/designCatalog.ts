import type { Fabric } from "@/types";

export function designNumber(fabric: Pick<Fabric, "art" | "name">) {
  return fabric.art.trim() || fabric.name.ru;
}

export function designWidthCm(fabric: Pick<Fabric, "width">) {
  return fabric.width.trim();
}
