import "server-only";
import sharp from "sharp";
import { saveBuffer } from "@/lib/storage";
import type { MockupCategory, Template, TemplateArea } from "@/types";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";
import { BACKGROUND_BASENAMES, ZONE_LAYER_KEYS } from "@/lib/templateZip/validate";

function manifestForStorage(manifest: ZipTemplateManifest, urlByFile: Map<string, string>): ZipTemplateManifest {
  const zones = manifest.zones.map((zone) => ({
    ...zone,
    mask: urlByFile.get(zone.mask) ?? zone.mask,
    shade: urlByFile.get(zone.shade) ?? zone.shade,
    weave: zone.weave ? urlByFile.get(zone.weave) ?? zone.weave : undefined,
    gloss: zone.gloss ? urlByFile.get(zone.gloss) ?? zone.gloss : undefined,
    light: zone.light ? urlByFile.get(zone.light) ?? zone.light : undefined,
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
  importWarnings?: string[];
}): Promise<{ ok: true; template: Template } | { ok: false; errors: string[] }> {
  const errors: string[] = [];
  const urlByFile = new Map<string, string>(Object.entries(input.assetUrls));
  const backgroundUrl = BACKGROUND_BASENAMES.map((name) => urlByFile.get(name)).find(Boolean);
  if (!backgroundUrl) errors.push("Не загружен background (jpg/png/webp)");

  for (const zone of input.manifest.zones) {
    for (const key of ZONE_LAYER_KEYS) {
      const file = zone[key];
      if (file && !urlByFile.get(file)) errors.push(`Не загружен ${file}`);
    }
  }
  if (errors.length) return { ok: false, errors };

  const prefix = `templates/${input.templateId}`;
  const storedManifest = manifestForStorage(input.manifest, urlByFile);
  const fabricView =
    input.manifest.fabricView === "stack" ||
    input.manifest.fabricView === "drape" ||
    input.manifest.fabricView === "roll" ||
    input.manifest.fabricView === "flat_fold" ||
    input.manifest.fabricView === "swatch"
      ? input.manifest.fabricView
      : undefined;
  const jsonUrl = await saveBuffer(`${prefix}/template.json`, Buffer.from(JSON.stringify(storedManifest), "utf8"), "application/json");

  let thumbnailUrl = backgroundUrl;
  try {
    const bgPath = backgroundUrl;
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
    weaveCapable: input.manifest.weaveCapable,
    fabricView,
    texture: input.manifest.texture,
    source: {
      psdUrl: "",
      fileName: `${displayName}.zip`,
      sizeMb: input.zipSizeMb,
      widthPx: input.manifest.size[0],
      heightPx: input.manifest.size[1],
    },
    engine: "uvgrid",
    compatibility: { ok: true, warnings: input.importWarnings ?? [] },
    baked: { backgroundUrl: backgroundUrl!, overlays: [], jsonUrl },
    areas,
    thumbnailUrl: thumbnailUrl!,
    isDefault: input.isDefault,
    order: Date.now(),
  };

  return { ok: true, template };
}
