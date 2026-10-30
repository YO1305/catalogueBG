import { getSession } from "@/lib/auth";
import { listFabricsByTemplateId } from "@/lib/db";
import { firestoreFailJson } from "@/lib/firestoreGuard";
import { canEditFabrics, isAdmin } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { templateId?: string };
  const templateId = body.templateId?.trim();
  if (!templateId) return Response.json({ error: "templateId" }, { status: 400 });
  try {
    const fabrics = await listFabricsByTemplateId(templateId);
    return Response.json({ ok: true, fabrics: fabrics.map((fabric) => ({ ...fabric, persisted: true })) });
  } catch (error) {
    const fail = firestoreFailJson(error);
    if (fail) return fail;
    throw error;
  }
}
