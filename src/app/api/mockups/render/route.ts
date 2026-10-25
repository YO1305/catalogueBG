import { getSession } from "@/lib/auth";
import { getFabric, getFabrics, getTemplatesListData, saveFabric } from "@/lib/db";
import { renderFabricMockup } from "@/lib/renderServer";
import { canEditFabrics, isAdmin } from "@/lib/roles";
import type { Fabric, Mockup, Template } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

class RenderError extends Error {
  constructor(message: string, readonly templateId: string) {
    super(message);
  }
}

async function renderAll(fabric: Fabric, mockups: Mockup[], templates: Template[], templateId?: string) {
  const next = [...mockups];
  let count = 0;
  for (let index = 0; index < next.length; index += 1) {
    const mockup = next[index];
    if (!mockup || (templateId && mockup.templateId !== templateId)) continue;
    const template = templates.find((item) => item.id === mockup.templateId);
    if (!template) continue;
    try {
      next[index] = await renderFabricMockup(fabric, template, mockup);
      count += 1;
    } catch (error) {
      throw new RenderError(error instanceof Error ? error.message : "render_failed", mockup.templateId);
    }
  }
  return { mockups: next, count };
}

/** A colourway reuses the main mockups' templates and placement with its own picture. */
async function renderVariant(fabric: Fabric, variantId: string, templates: Template[]) {
  const variant = fabric.variants?.find((item) => item.id === variantId);
  if (!variant?.design.webUrl) return { fabric, count: 0 };
  const source = { ...fabric, id: `${fabric.id}-${variant.id}`, design: { ...variant.design, seamless: fabric.design.seamless } };
  const result = await renderAll(source, fabric.mockups, templates);
  const variants = (fabric.variants ?? []).map((item) => (item.id === variantId ? { ...item, mockups: result.mockups } : item));
  return { fabric: { ...fabric, variants }, count: result.count };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !(canEditFabrics(session.role) || isAdmin(session.role))) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { templateId?: string; fabricId?: string; variantId?: string };
  const [source, templates] = await Promise.all([
    body.fabricId ? getFabric(body.fabricId).then((item) => (item ? [item] : [])) : getFabrics(),
    getTemplatesListData(),
  ]);
  const fabrics = source.filter((fabric) => fabric.mockups.some((mockup) => !body.templateId || mockup.templateId === body.templateId));
  let count = 0;
  const updated: { fabricId: string; mockups: Mockup[]; variants?: Fabric["variants"] }[] = [];
  for (const fabric of fabrics) {
    try {
      let next: Fabric;
      if (body.variantId) {
        const result = await renderVariant(fabric, body.variantId, templates);
        next = result.fabric;
        count += result.count;
      } else {
        const result = await renderAll(fabric, fabric.mockups, templates, body.templateId);
        next = { ...fabric, mockups: result.mockups };
        count += result.count;
      }
      next = { ...next, updatedAt: new Date().toISOString() };
      await saveFabric(next);
      updated.push({ fabricId: fabric.id, mockups: next.mockups, variants: next.variants });
    } catch (error) {
      const message = error instanceof Error ? error.message : "render_failed";
      const templateId = error instanceof RenderError ? error.templateId : undefined;
      console.error("mockup render failed", { fabricId: fabric.id, variantId: body.variantId, templateId, message });
      return Response.json({ ok: false, error: message, fabricId: fabric.id, templateId }, { status: 500 });
    }
  }
  return Response.json({ ok: true, count, fabrics: updated });
}
