import type { MockupCategory } from "@/types";

export const MOCKUP_CATEGORIES: MockupCategory[] = ["kitchen", "bedding", "kurpacha", "fashion"];

export function mockupCategoryLabelKey(id: MockupCategory) {
  return `mockups.category.${id}` as const;
}

export function templatesInCategory<T extends { category?: MockupCategory }>(items: T[], category: MockupCategory) {
  return items.filter((item) => !item.category || item.category === category);
}
