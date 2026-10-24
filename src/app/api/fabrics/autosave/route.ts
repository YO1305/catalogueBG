import { getSession } from "@/lib/auth";
import { persistFabric } from "@/lib/fabricSave";
import { canEditFabrics } from "@/lib/roles";
import type { Fabric } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canEditFabrics(session.role)) return Response.json({ error: "forbidden" }, { status: 403 });
  const fabric = (await request.json()) as Fabric;
  if (!fabric?.id) return Response.json({ error: "fabric" }, { status: 400 });
  const result = await persistFabric(session, fabric);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 409 });
  return Response.json({ ok: true, updatedAt: result.fabric.updatedAt });
}
