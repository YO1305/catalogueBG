/** Keeps uploads under Vercel's ~4.5 MB serverless body limit. */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_EDGE_PX = 2400;

export async function prepareUploadImage(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const base = file.name.replace(/\.[^.]+$/i, "") || "upload";
  for (const quality of [0.88, 0.78, 0.68]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
    }
  }
  const fallback = await canvasToBlob(canvas, 0.6);
  if (fallback) return new File([fallback], `${base}.jpg`, { type: "image/jpeg" });
  return file;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}
