import type { Fabric, Mockup } from "@/types";

function collect(ids: Set<string>, mockups: Mockup[]) {
  for (const mockup of mockups) {
    if (mockup.templateId) ids.add(mockup.templateId);
  }
}

export function fabricTemplateIds(fabric: Pick<Fabric, "mockups" | "variants">): string[] {
  const ids = new Set<string>();
  collect(ids, fabric.mockups);
  for (const variant of fabric.variants ?? []) collect(ids, variant.mockups);
  return [...ids];
}

export function fabricUsesTemplate(fabric: Pick<Fabric, "mockups" | "variants" | "templateIds">, templateId: string): boolean {
  if (fabric.templateIds?.includes(templateId)) return true;
  return fabricTemplateIds(fabric).includes(templateId);
}
