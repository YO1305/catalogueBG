import JSZip from "jszip";
import { collectManifestAssetPaths } from "@/lib/templateZip/collectAssets";
import { resolveZipAssetPath } from "@/lib/templateZip/validate";
import type { ZipTemplateManifest } from "@/lib/templateZip/types";

async function readResponseErrors(response: Response): Promise<string[]> {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { ok?: boolean; errors?: string[]; error?: string };
    if (data.errors?.length) return data.errors;
    if (data.error) return [data.error];
  } catch {
    if (response.status === 413) return ["Архив или файл слишком большой для сервера. Файлы загружаются по одному — обновите страницу и повторите."];
    if (text.includes("Request Entity Too Large")) return ["Файл слишком большой для загрузки на сервер."];
  }
  return [`Ошибка сервера (${response.status})`];
}

export async function uploadTemplateZipAssets(
  zipFile: File,
  manifest: ZipTemplateManifest,
  templateId: string,
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<{ ok: true; assetUrls: Record<string, string> } | { ok: false; errors: string[] }> {
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  const fileNames = new Set<string>();
  zip.forEach((relativePath, entry) => {
    if (!entry.dir) fileNames.add(relativePath.replace(/\\/g, "/"));
  });

  const requestedPaths = collectManifestAssetPaths(manifest);
  const [expectedW, expectedH] = manifest.size;
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
    const form = new FormData();
    form.set("templateId", templateId);
    form.set("filename", base);
    form.set("file", blob, base);
    if (base.toLowerCase().endsWith(".png")) {
      form.set("expectedW", String(expectedW));
      form.set("expectedH", String(expectedH));
    }
    const response = await fetch("/api/templates/zip-asset", { method: "POST", body: form });
    if (!response.ok) {
      const errors = await readResponseErrors(response);
      return { ok: false, errors };
    }
    const data = (await response.json()) as { ok: boolean; url?: string };
    if (!data.ok || !data.url) return { ok: false, errors: ["Не удалось загрузить файл"] };
    assetUrls[requested] = data.url;
    const baseOnly = requested.split("/").pop() ?? requested;
    assetUrls[baseOnly] = data.url;
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
  manifest: ZipTemplateManifest;
  assetUrls: Record<string, string>;
  zipSizeMb: number;
}): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }> {
  const response = await fetch("/api/templates/import-zip/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    return { ok: false, errors: await readResponseErrors(response) };
  }
  const data = (await response.json()) as { ok: boolean; id?: string };
  if (!data.ok || !data.id) return { ok: false, errors: ["Не удалось сохранить шаблон"] };
  return { ok: true, id: data.id };
}
