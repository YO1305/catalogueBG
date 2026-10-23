import { getSession } from "@/lib/auth";
import { getDb, saveFabric } from "@/lib/db";
import { renderFabricMockup } from "@/lib/renderServer";
import { canEditFabrics, isAdmin } from "@/lib/roles";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { templateId?: string; fabricId?: string };
  const db = await getDb();
  const fabrics = db.fabrics.filter((fabric) => (body.fabricId ? fabric.id === body.fabricId : true) && fabric.mockups.some((mockup) => !body.templateId || mockup.templateId === body.templateId));
  let count = 0;
  for (const fabric of fabrics) {
    const next = { ...fabric, mockups: [...fabric.mockups], updatedAt: new Date().toISOString() };
    for (let index = 0; index < next.mockups.length; index += 1) {
      const mockup = next.mockups[index];
      if (!mockup || (body.templateId && mockup.templateId !== body.templateId)) continue;
      const template = db.templates.find((item) => item.id === mockup.templateId);
      if (!template) continue;
      next.mockups[index] = await renderFabricMockup(next, template, mockup);
      count += 1;
    }
    await saveFabric(next);
  }
  return Response.json({ ok: true, count });
}
