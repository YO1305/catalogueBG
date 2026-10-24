import "server-only";
import sharp from "sharp";
import { saveBuffer } from "@/lib/storage";
import type { MockupCategory, ProductType, Template, TemplateArea } from "@/types";
import { JSZip, parseTemplateZipBuffer, resolveZipAssetPath } from "@/lib/templateZip/readZip";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";

function contentTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

async function pngMatchesSize(data: Buffer, width: number, height: number): Promise<boolean> {
  const meta = await sharp(data).metadata();
  return meta.width === width && meta.height === height;
}

async function assertZonePngSizes(manifest: ZipTemplateManifest, zip: JSZip, fileNames: Set<string>): Promise<string[]> {
  const [w, h] = manifest.size;
  const errors: string[] = [];
  for (const zone of manifest.zones) {
    for (const key of ["mask", "shade", "weave", "gloss"] as const) {
      const rel = zone[key];
      if (!rel) continue;
      const path = resolveZipAssetPath(fileNames, rel);
      if (!path) continue;
      const file = zip.file(path);
      if (!file) continue;
      const buf = Buffer.from(await file.async("arraybuffer"));
      if (!(await pngMatchesSize(buf, w, h))) {
        errors.push(`Зона «${zone.label}»: ${rel} должен быть ${w}×${h} px`);
      }
    }
  }
  return errors;
}

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

export async function importTemplateZipFromBuffer(
  data: Buffer,
  input: { category: MockupCategory; name: string; productTypes: string[]; isDefault: boolean },
): Promise<{ ok: true; template: Template } | { ok: false; errors: string[] }> {
  const parsed = await parseTemplateZipBuffer(data);
  if (!parsed.ok) return parsed;

  const zip = await JSZip.loadAsync(data);
  const fileNames = new Set(parsed.parsed.assetPaths);
  const sizeErrors = await assertZonePngSizes(parsed.parsed.manifest, zip, fileNames);
  if (sizeErrors.length) return { ok: false, errors: sizeErrors };

  const templateId = crypto.randomUUID();
  const prefix = `templates/${templateId}`;
  const urlByBasename = new Map<string, string>();

  async function uploadZipAsset(requested: string): Promise<string> {
    const path = resolveZipAssetPath(fileNames, requested);
    if (!path) throw new Error(`missing:${requested}`);
    const file = zip.file(path);
    if (!file) throw new Error(`missing:${requested}`);
    const buf = Buffer.from(await file.async("arraybuffer"));
    const base = path.split("/").pop() ?? path;
    const storagePath = `${prefix}/${base}`;
    const url = await saveBuffer(storagePath, buf, contentTypeForPath(base));
    urlByBasename.set(requested, url);
    urlByBasename.set(base, url);
    return url;
  }

  const bgPath = resolveZipAssetPath(fileNames, "background.jpg");
  if (!bgPath) return { ok: false, errors: ["background.jpg не найден"] };
  const backgroundUrl = await uploadZipAsset("background.jpg");

  const manifest = parsed.parsed.manifest;
  for (const zone of manifest.zones) {
    await uploadZipAsset(zone.mask);
    await uploadZipAsset(zone.shade);
    if (zone.weave) await uploadZipAsset(zone.weave);
    if (zone.gloss) await uploadZipAsset(zone.gloss);
  }

  const storedManifest = manifestForStorage(manifest, urlByBasename);
  const jsonUrl = await saveBuffer(`${prefix}/template.json`, Buffer.from(JSON.stringify(storedManifest), "utf8"), "application/json");

  const thumbBuf = await sharp(Buffer.from(await zip.file(bgPath)!.async("arraybuffer")))
    .resize(600, 400, { fit: "cover" })
    .webp({ quality: 78 })
    .toBuffer();
  const thumbnailUrl = await saveBuffer(`${prefix}/thumb.webp`, thumbBuf, "image/webp");

  const areas: TemplateArea[] = manifest.zones.map((zone) => ({
    id: zone.id,
    label: zone.label,
    psdLayerPath: "",
    soWidthPx: 0,
    soHeightPx: 0,
    transform: [],
    maskUrl: urlByBasename.get(zone.mask) ?? urlByBasename.get(zone.mask.split("/").pop() ?? ""),
    shadeUrl: urlByBasename.get(zone.shade) ?? urlByBasename.get(zone.shade.split("/").pop() ?? ""),
    pxPerCm: zone.pxPerCm,
    realWidthCm: 0,
    fill: true,
  }));

  const displayName = input.name.trim() || manifest.name;
  const template: Template = {
    id: templateId,
    kind: "zip",
    category: input.category,
    productTypes: input.productTypes,
    name: displayName,
    finish: manifest.finish === "sateen" ? "sateen" : manifest.finish === "matte" ? "matte" : manifest.finish,
    source: {
      psdUrl: "",
      fileName: `${displayName}.zip`,
      sizeMb: Math.round((data.length / (1024 * 1024)) * 10) / 10,
      widthPx: manifest.size[0],
      heightPx: manifest.size[1],
    },
    engine: "uvgrid",
    compatibility: { ok: true, warnings: [] },
    baked: { backgroundUrl, overlays: [], jsonUrl },
    areas,
    thumbnailUrl,
    isDefault: input.isDefault,
    order: Date.now(),
  };

  return { ok: true, template };
}
