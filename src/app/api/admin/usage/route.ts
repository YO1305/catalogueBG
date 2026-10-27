import { getSession } from "@/lib/auth";
import { canAccessSection } from "@/lib/adminAccess";
import { planLimits, resolveBillingPlan } from "@/lib/vercelPlanLimits";
import { getUsageSnapshot } from "@/lib/vercelUsage";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessSection(session, "usage")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const snapshot = await getUsageSnapshot();
  const plan = resolveBillingPlan();
  return Response.json({ snapshot, limits: planLimits(plan) });
}
