import { getSession } from "@/lib/auth";
import { saveTemplate } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import { finalizeZipTemplateImport } from "@/lib/templateZip/finalizeImport";
import { validateZipTemplateJson } from "@/lib/templateZip/validate";
import type { MockupCategory } from "@/types";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return Response.json({ ok: false, errors: ["Нет доступа"] }, { status: 403 });
  }
  try {
    const body = (await request.json()) as {
      templateId?: string;
      category?: MockupCategory;
      name?: string;
      productTypes?: string[];
      isDefault?: boolean;
      manifest?: unknown;
      assetUrls?: Record<string, string>;
      zipSizeMb?: number;
    };
    const templateId = String(body.templateId ?? "").trim();
    if (!templateId) {
      return Response.json({ ok: false, errors: ["Нет идентификатора шаблона"] }, { status: 400 });
    }
    const validated = validateZipTemplateJson(body.manifest);
    if (!validated.ok) {
      return Response.json({ ok: false, errors: validated.errors }, { status: 400 });
    }
    const productTypes = body.productTypes ?? [];
    if (!productTypes.length) {
      return Response.json({ ok: false, errors: ["Выберите хотя бы одно изделие"] }, { status: 400 });
    }
    const result = await finalizeZipTemplateImport({
      templateId,
      category: body.category ?? "bedding",
      name: String(body.name ?? ""),
      productTypes,
      isDefault: Boolean(body.isDefault),
      manifest: validated.manifest,
      assetUrls: body.assetUrls ?? {},
      zipSizeMb: Number(body.zipSizeMb) || 0,
    });
    if (!result.ok) {
      return Response.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    await saveTemplate(result.template);
    revalidatePath("/admin/templates");
    return Response.json({ ok: true, id: result.template.id });
  } catch (error) {
    console.error("templates/import-zip/complete", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, errors: [`Ошибка сохранения: ${message}`] }, { status: 500 });
  }
}
