import "server-only";
import sharp from "sharp";
import { saveBuffer } from "@/lib/storage";
import type { MockupCategory, Template, TemplateArea } from "@/types";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";

function manifestForStorage(manifest: ZipTemplateManifest, urlByFile: Map<string, string>): ZipTemplateManifest {
  const zones = manifest.zones.map((zone) => ({
    ...zone,
    mask: urlByFile.get(zone.mask) ?? zone.mask,
    shade: urlByFile.get(zone.shade) ?? zone.shade,
    weave: zone.weave ? urlByFile.get(zone.weave) ?? zone.weave : undefined,
    gloss: zone.gloss ? urlByFile.get(zone.gloss) ?? zone.gloss : undefined,
  }));
  return { ...manifest, zones };
}

export async function finalizeZipTemplateImport(input: {
  templateId: string;
  category: MockupCategory;
  name: string;
  productTypes: string[];
  isDefault: boolean;
  manifest: ZipTemplateManifest;
  assetUrls: Record<string, string>;
  zipSizeMb: number;
}): Promise<{ ok: true; template: Template } | { ok: false; errors: string[] }> {
  const errors: string[] = [];
  const urlByFile = new Map<string, string>(Object.entries(input.assetUrls));
  const backgroundUrl = urlByFile.get("background.jpg");
  if (!backgroundUrl) errors.push("Не загружен background.jpg");

  for (const zone of input.manifest.zones) {
    if (!urlByFile.get(zone.mask)) errors.push(`Не загружен ${zone.mask}`);
    if (!urlByFile.get(zone.shade)) errors.push(`Не загружен ${zone.shade}`);
    if (zone.weave && !urlByFile.get(zone.weave)) errors.push(`Не загружен ${zone.weave}`);
    if (zone.gloss && !urlByFile.get(zone.gloss)) errors.push(`Не загружен ${zone.gloss}`);
  }
  if (errors.length) return { ok: false, errors };

  const prefix = `templates/${input.templateId}`;
  const storedManifest = manifestForStorage(input.manifest, urlByFile);
  const jsonUrl = await saveBuffer(`${prefix}/template.json`, Buffer.from(JSON.stringify(storedManifest), "utf8"), "application/json");

  let thumbnailUrl = backgroundUrl;
  try {
    const bgPath = urlByFile.get("background.jpg");
    if (bgPath?.startsWith("/")) {
      const { readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const local = join(process.cwd(), "public", bgPath.replace(/^\//, ""));
      const thumbBuf = await sharp(readFileSync(local)).resize(600, 400, { fit: "cover" }).webp({ quality: 78 }).toBuffer();
      thumbnailUrl = await saveBuffer(`${prefix}/thumb.webp`, thumbBuf, "image/webp");
    } else if (bgPath) {
      const res = await fetch(bgPath);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const thumbBuf = await sharp(buf).resize(600, 400, { fit: "cover" }).webp({ quality: 78 }).toBuffer();
        thumbnailUrl = await saveBuffer(`${prefix}/thumb.webp`, thumbBuf, "image/webp");
      }
    }
  } catch {
    thumbnailUrl = backgroundUrl;
  }

  const areas: TemplateArea[] = input.manifest.zones.map((zone) => ({
    id: zone.id,
    label: zone.label,
    psdLayerPath: "",
    soWidthPx: 0,
    soHeightPx: 0,
    transform: [],
    maskUrl: urlByFile.get(zone.mask),
    shadeUrl: urlByFile.get(zone.shade),
    pxPerCm: zone.pxPerCm,
    realWidthCm: 0,
    fill: true,
  }));

  const displayName = input.name.trim() || input.manifest.name;
  const template: Template = {
    id: input.templateId,
    kind: "zip",
    category: input.category,
    productTypes: input.productTypes,
    name: displayName,
    finish:
      input.manifest.finish === "sateen" ? "sateen" : input.manifest.finish === "matte" ? "matte" : input.manifest.finish,
    source: {
      psdUrl: "",
      fileName: `${displayName}.zip`,
      sizeMb: input.zipSizeMb,
      widthPx: input.manifest.size[0],
      heightPx: input.manifest.size[1],
    },
    engine: "uvgrid",
    compatibility: { ok: true, warnings: [] },
    baked: { backgroundUrl: backgroundUrl!, overlays: [], jsonUrl },
    areas,
    thumbnailUrl: thumbnailUrl!,
    isDefault: input.isDefault,
    order: Date.now(),
  };

  return { ok: true, template };
}
