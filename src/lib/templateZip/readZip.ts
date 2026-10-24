import JSZip from "jszip";
import type { ParsedTemplateZip } from "@/lib/templateZip/types";
import { resolveZipAssetPath, validateZipAssets, validateZipTemplateJson } from "@/lib/templateZip/validate";

function listFilePaths(zip: JSZip): Set<string> {
  const names = new Set<string>();
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    names.add(relativePath.replace(/\\/g, "/"));
  });
  return names;
}

async function readTemplateJson(zip: JSZip): Promise<{ path: string; text: string } | null> {
  const preferred = ["template.json", "template/template.json"];
  for (const path of preferred) {
    const file = zip.file(path);
    if (file) return { path, text: await file.async("string") };
  }
  const fallback = Object.keys(zip.files).find((p) => p.endsWith("template.json") && !p.includes("__MACOSX") && !zip.files[p]?.dir);
  if (!fallback) return null;
  const file = zip.file(fallback);
  if (!file) return null;
  return { path: fallback.replace(/\\/g, "/"), text: await file.async("string") };
}

export async function parseTemplateZipBuffer(data: ArrayBuffer | Buffer): Promise<
  | { ok: true; parsed: ParsedTemplateZip }
  | { ok: false; errors: string[] }
> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    return { ok: false, errors: ["Не удалось открыть ZIP"] };
  }
  const jsonEntry = await readTemplateJson(zip);
  if (!jsonEntry) return { ok: false, errors: ["В архиве нет template.json"] };
  let json: unknown;
  try {
    json = JSON.parse(jsonEntry.text);
  } catch {
    return { ok: false, errors: ["template.json не является валидным JSON"] };
  }
  const validated = validateZipTemplateJson(json);
  if (!validated.ok) return validated;
  const fileNames = listFilePaths(zip);
  const assetErrors = validateZipAssets(validated.manifest, fileNames);
  if (assetErrors.length) return { ok: false, errors: assetErrors };
  const assetPaths = [...fileNames];
  return {
    ok: true,
    parsed: { jsonPath: jsonEntry.path, manifest: validated.manifest, assetPaths },
  };
}

export async function parseTemplateZipFile(file: File) {
  return parseTemplateZipBuffer(await file.arrayBuffer());
}

export function zipRootPrefix(jsonPath: string): string {
  const idx = jsonPath.lastIndexOf("/");
  return idx >= 0 ? jsonPath.slice(0, idx + 1) : "";
}

export { resolveZipAssetPath, JSZip };
