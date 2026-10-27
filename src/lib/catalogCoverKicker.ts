import type { Catalog, Lang } from "@/types";

export function catalogCoverKicker(catalog: Pick<Catalog, "coverKicker">, lang: Lang, fallback: string): string {
  const row = catalog.coverKicker;
  if (!row) return fallback;
  const picked = row[lang]?.trim() || row.ru?.trim() || row.en?.trim() || row.uz?.trim();
  return picked || fallback;
}
