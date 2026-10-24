import { TemplateBoard } from "@/components/admin/TemplateBoard";
import { requireSession } from "@/lib/auth";
import { getTemplatesBoardData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [session, { templates, productTypes }] = await Promise.all([requireSession(["admin", "designer"]), getTemplatesBoardData()]);
  return <TemplateBoard templates={templates} products={productTypes} role={session.role} />;
}
