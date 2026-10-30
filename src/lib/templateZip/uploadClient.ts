import JSZip from "jszip";
import { uploadPublicBlob } from "@/lib/blob/clientUpload";
import { collectManifestAssetPaths } from "@/lib/templateZip/collectAssets";
import { manifestForWire, type ZipTemplateManifestWire } from "@/lib/templateZip/manifestWire";
import { resolveZipAssetPath } from "@/lib/templateZip/validate";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";

async function readResponseErrors(response: Response): Promise<string[]> {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { ok?: boolean; errors?: string[]; error?: string };
    if (data.errors?.length) return data.errors;
    if (data.error === "forbidden") return ["Нет доступа"];
    if (data.error) return [data.error];
  } catch {
    if (response.status === 413) return ["Файл слишком большой для загрузки."];
    if (text.includes("Request Entity Too Large")) return ["Файл слишком большой для загрузки."];
  }
  return [`Ошибка сервера (${response.status})`];
}

export async function uploadTemplateZipAssets(
  zipFile: File,
  manifest: ZipTemplateManifest,
  templateJsonPath: string,
  templateId: string,
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<{ ok: true; assetUrls: Record<string, string> } | { ok: false; errors: string[] }> {
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  const fileNames = new Set<string>();
  zip.forEach((relativePath, entry) => {
    if (!entry.dir) fileNames.add(relativePath.replace(/\\/g, "/"));
  });

  const requestedPaths = collectManifestAssetPaths(manifest, fileNames, templateJsonPath);
  const assetUrls: Record<string, string> = {};
  let done = 0;

  for (const requested of requestedPaths) {
    const path = resolveZipAssetPath(fileNames, requested);
    if (!path) return { ok: false, errors: [`В ZIP нет файла ${requested}`] };
    const entry = zip.file(path);
    if (!entry) return { ok: false, errors: [`В ZIP нет файла ${requested}`] };
    const base = path.split("/").pop() ?? path;
    onProgress?.(done, requestedPaths.length, base);
    const blob = await entry.async("blob");
    const storageName = base;
    const pathname = `templates/${templateId}/${storageName}`;
    let url: string;
    try {
      url = await uploadPublicBlob(pathname, blob);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errors: [message || `Не удалось загрузить ${base}`] };
    }
    assetUrls[requested] = url;
    assetUrls[base] = url;
    if (path !== requested) assetUrls[path] = url;
    done += 1;
    onProgress?.(done, requestedPaths.length, base);
  }

  return { ok: true, assetUrls };
}

export async function completeTemplateZipImport(body: {
  templateId: string;
  category: string;
  name: string;
  productTypes: string[];
  isDefault: boolean;
  manifest: ZipTemplateManifestWire;
  assetUrls: Record<string, string>;
  zipSizeMb: number;
}): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }> {
  const response = await fetch("/api/templates/import-zip/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const errors = await readResponseErrors(response);
    if (errors.includes("quota") || response.status === 429) return { ok: false, errors: ["quota"] };
    return { ok: false, errors };
  }
  const data = (await response.json()) as { ok: boolean; id?: string };
  if (!data.ok || !data.id) return { ok: false, errors: ["Не удалось сохранить шаблон"] };
  return { ok: true, id: data.id };
}

export { manifestForWire };
