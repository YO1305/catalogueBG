import { uploadPublicBlob } from "@/lib/blob/clientUpload";

export type ProcessedDesign = {
  webUrl: string;
  thumbUrl: string;
  originalUrl: string;
  widthPx: number;
  heightPx: number;
  colors: string[];
};

export async function processDesignUpload(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<ProcessedDesign | null> {
  const designId = crypto.randomUUID();
  const extMatch = file.name.match(/\.(jpe?g|png|webp|tiff?)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
  const pathname = `private/designs/${designId}/source${ext}`;
  const sourceUrl = await uploadPublicBlob(pathname, file, {
    onUploadProgress: (loaded, total) => {
      if (total > 0) onProgress?.(loaded / total * 0.85);
    },
  });
  onProgress?.(0.92);
  const response = await fetch("/api/images/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl, fileName: file.name, designId }),
  });
  onProgress?.(1);
  if (!response.ok) return null;
  return (await response.json()) as ProcessedDesign;
}
