import { upload } from "@vercel/blob/client";

export function contentTypeForFilename(filename: string): string | undefined {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".json")) return "application/json";
  return undefined;
}

export async function uploadPublicBlob(
  pathname: string,
  body: Blob | File,
  options?: { onUploadProgress?: (loaded: number, total: number) => void },
): Promise<string> {
  const result = await upload(pathname, body, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    contentType: contentTypeForFilename(pathname.split("/").pop() ?? pathname),
    multipart: body.size > 8 * 1024 * 1024,
    onUploadProgress: options?.onUploadProgress
      ? (event) => options.onUploadProgress?.(event.loaded, event.total)
      : undefined,
  });
  return result.url;
}
