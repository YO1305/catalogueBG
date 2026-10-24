import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { saveBuffer } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

function storageErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/storage_blob|BLOB_READ_WRITE|oidc/i.test(message)) {
    return "Хранилище файлов не настроено на сервере (Vercel Blob). Обратитесь к администратору.";
  }
  return "Не удалось сохранить файл на сервере.";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return Response.json({ ok: false, errors: ["Нет доступа"] }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const templateId = String(form.get("templateId") ?? "").trim();
    const filename = String(form.get("filename") ?? "").trim().replace(/\\/g, "/").split("/").pop() ?? "";
    const file = form.get("file");
    const expectedW = Number(form.get("expectedW") ?? 0);
    const expectedH = Number(form.get("expectedH") ?? 0);
    if (!templateId || !filename || !(file instanceof File)) {
      return Response.json({ ok: false, errors: ["Некорректная загрузка файла"] }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return Response.json({ ok: false, errors: ["Недопустимое имя файла"] }, { status: 400 });
    }
    if (file.size > 45 * 1024 * 1024) {
      return Response.json({ ok: false, errors: [`Файл ${filename} слишком большой (макс. 45 МБ)`] }, { status: 400 });
    }
    const data = Buffer.from(await file.arrayBuffer());
    if (filename.toLowerCase().endsWith(".png") && expectedW > 0 && expectedH > 0) {
      const meta = await sharp(data).metadata();
      if (meta.width !== expectedW || meta.height !== expectedH) {
        return Response.json(
          { ok: false, errors: [`${filename}: нужен размер ${expectedW}×${expectedH} px, получено ${meta.width}×${meta.height}`] },
          { status: 400 },
        );
      }
    }
    const contentType =
      filename.toLowerCase().endsWith(".png")
        ? "image/png"
        : filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
    const url = await saveBuffer(`templates/${templateId}/${filename}`, data, contentType);
    return Response.json({ ok: true, url, filename });
  } catch (error) {
    console.error("templates/zip-asset", error);
    return Response.json({ ok: false, errors: [storageErrorMessage(error)] }, { status: 503 });
  }
}
