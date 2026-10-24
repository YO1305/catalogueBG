import type { Fabric } from "@/types";

export function filterFabrics(
  fabrics: Fabric[],
  query: {
    search: string;
    collectionId: string;
    fabricTypeId: string;
  },
) {
  const q = query.search.trim().toLowerCase();
  return fabrics.filter((fabric) => {
    if (query.collectionId && fabric.collectionId !== query.collectionId) return false;
    if (query.fabricTypeId && fabric.fabricTypeId !== query.fabricTypeId) return false;
    if (!q) return true;
    const hay = [fabric.art, fabric.name.ru, fabric.name.en, fabric.name.uz, fabric.tags.join(" ")].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
