import { TemplateBoard } from "@/components/admin/TemplateBoard";
import { requireSession } from "@/lib/auth";
import { getTemplatesBoardData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await requireSession(["admin", "designer"]);
  const { templates, productTypes } = await getTemplatesBoardData();
  return <TemplateBoard templates={templates} products={productTypes} role={session.role} />;
}
