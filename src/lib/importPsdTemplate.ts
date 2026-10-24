import { summarizePsd } from "@/lib/psdSummary";
import type { MockupCategory, Template, TemplateArea } from "@/types";

export async function buildTemplateFromPsd(file: File, category: MockupCategory, name: string): Promise<Template> {
  const buffer = await file.arrayBuffer();
  const { readPsd } = await import("ag-psd");
  const summary = summarizePsd(readPsd(buffer));
  const id = crypto.randomUUID();
  const areas: TemplateArea[] = summary.areas.map((area, index) => ({
    id: `area-${index + 1}`,
    label: area.name,
    psdLayerPath: area.path,
    soWidthPx: area.width || 800,
    soHeightPx: area.height || 600,
    transform: area.transform.length >= 8 ? area.transform : [100, 100, 700, 100, 700, 500, 100, 500],
    pxPerCm: 4,
    realWidthCm: 200,
    fill: true,
  }));
  return {
    id,
    category,
    productTypes: [],
    name: name.trim() || file.name.replace(/\.psd$/i, ""),
    source: {
      psdUrl: "",
      fileName: file.name,
      sizeMb: Math.round((file.size / 1024 / 1024) * 10) / 10,
      widthPx: summary.width || 1500,
      heightPx: summary.height || 1000,
    },
    engine: summary.warnings.length ? "photopea" : "webgl",
    compatibility: { ok: summary.warnings.length === 0, warnings: summary.warnings },
    baked: { backgroundUrl: "", overlays: [], jsonUrl: "" },
    areas,
    thumbnailUrl: "",
    isDefault: false,
    order: 100,
  };
}
