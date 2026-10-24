import type { Template, TemplateEngine, TemplateKind } from "@/types";

type SortableTemplate = {
  kind?: TemplateKind;
  engine?: TemplateEngine;
  order?: number;
  name: string;
};

function templatePriority(template: SortableTemplate): number {
  if (template.kind === "zip" || template.engine === "uvgrid") return 0;
  if (template.kind === "demo") return 2;
  if (template.engine === "webgl" || template.engine === "photopea") return 1;
  return 1;
}

/** ZIP / uvgrid first, then other engines, demo last. */
export function sortTemplatesForWizard<T extends SortableTemplate>(templates: T[]): T[] {
  return [...templates].sort((a, b) => {
    const pa = templatePriority(a);
    const pb = templatePriority(b);
    if (pa !== pb) return pa - pb;
    return (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, "ru");
  });
}
