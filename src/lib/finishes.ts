import type { Finish, Localized } from "@/types";

const loc = (ru: string, en: string, uz: string): Localized => ({ ru, en, uz });

/** Used until the directory has its own rows (Firestore collection is empty). */
export const DEFAULT_FINISHES: Finish[] = [
  { id: "dyed", name: loc("Крашение", "Dyed", "Bo'yalgan"), order: 1, active: true, toned: true },
  { id: "printed", name: loc("Печать", "Printed", "Bosma"), order: 2, active: true },
  { id: "bleached", name: loc("Отбелённая", "Bleached", "Oqartirilgan"), order: 3, active: true },
  { id: "yarn-dyed", name: loc("Пряжа крашеная", "Yarn-dyed", "Ip bo'yalgan"), order: 4, active: true },
];

export function withDefaultFinishes(rows: Finish[] | undefined): Finish[] {
  return rows?.length ? [...rows].sort((a, b) => a.order - b.order) : DEFAULT_FINISHES;
}
