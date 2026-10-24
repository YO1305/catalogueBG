import { getSession } from "@/lib/auth";
import { saveTemplate } from "@/lib/db";
import { importTemplateZipFromBuffer } from "@/lib/templateZip/importServer";
import { isAdmin } from "@/lib/roles";
import type { MockupCategory } from "@/types";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return Response.json({ ok: false, errors: ["Нет доступа"] }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, errors: ["Выберите ZIP-файл"] }, { status: 400 });
  }
  const category = String(form.get("category") ?? "bedding") as MockupCategory;
  const name = String(form.get("name") ?? "");
  const isDefault = form.get("isDefault") === "1";
  let productTypes: string[] = [];
  try {
    productTypes = JSON.parse(String(form.get("productTypes") ?? "[]")) as string[];
  } catch {
    return Response.json({ ok: false, errors: ["Некорректный список изделий"] }, { status: 400 });
  }
  if (!productTypes.length) {
    return Response.json({ ok: false, errors: ["Выберите хотя бы одно изделие"] }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importTemplateZipFromBuffer(buffer, { category, name, productTypes, isDefault });
  if (!result.ok) {
    return Response.json({ ok: false, errors: result.errors }, { status: 400 });
  }
  await saveTemplate(result.template);
  revalidatePath("/admin/templates");
  return Response.json({ ok: true, id: result.template.id });
}
