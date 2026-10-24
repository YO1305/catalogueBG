import { sortTemplatesForWizard } from "@/lib/templateSort";
import type { MockupCategory, TemplateEngine, TemplateKind } from "@/types";

export const MOCKUP_CATEGORIES: MockupCategory[] = ["kitchen", "bedding", "kurpacha", "fashion"];

export function mockupCategoryLabelKey(id: MockupCategory) {
  return `mockups.category.${id}` as const;
}

export function templatesInCategory<T extends { id: string; category?: MockupCategory; kind?: TemplateKind; engine?: TemplateEngine; order?: number; name: string }>(
  items: T[],
  category: MockupCategory,
) {
  const filtered = items.filter((item) => !item.category || item.category === category);
  return sortTemplatesForWizard(filtered);
}
