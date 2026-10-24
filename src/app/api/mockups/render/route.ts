import { getSession } from "@/lib/auth";
import { getDb, saveFabric } from "@/lib/db";
import { renderFabricMockup } from "@/lib/renderServer";
import { canEditFabrics, isAdmin } from "@/lib/roles";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { templateId?: string; fabricId?: string };
  const db = await getDb();
  const fabrics = db.fabrics.filter((fabric) => (body.fabricId ? fabric.id === body.fabricId : true) && fabric.mockups.some((mockup) => !body.templateId || mockup.templateId === body.templateId));
  let count = 0;
  const updated: { fabricId: string; mockups: typeof fabrics[0]["mockups"] }[] = [];
  for (const fabric of fabrics) {
    const next = { ...fabric, mockups: [...fabric.mockups], updatedAt: new Date().toISOString() };
    for (let index = 0; index < next.mockups.length; index += 1) {
      const mockup = next.mockups[index];
      if (!mockup || (body.templateId && mockup.templateId !== body.templateId)) continue;
      const template = db.templates.find((item) => item.id === mockup.templateId);
      if (!template) continue;
      try {
        next.mockups[index] = await renderFabricMockup(next, template, mockup);
        count += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "render_failed";
        return Response.json({ ok: false, error: message, fabricId: fabric.id, templateId: mockup.templateId }, { status: 500 });
      }
    }
    await saveFabric(next);
    updated.push({ fabricId: fabric.id, mockups: next.mockups });
  }
  return Response.json({ ok: true, count, fabrics: updated });
}
