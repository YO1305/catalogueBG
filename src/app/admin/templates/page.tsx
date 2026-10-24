import { TemplateBoard } from "@/components/admin/TemplateBoard";
import { requireSession } from "@/lib/auth";
import { getTemplatesListData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await requireSession(["admin", "designer"]);
  const templates = await getTemplatesListData();
  return <TemplateBoard templates={templates} products={[]} role={session.role} />;
}
