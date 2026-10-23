import { TemplateList } from "@/components/admin/TemplateScreens";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireSession(["admin"]);
  const db = await getDb();
  return <TemplateList templates={db.templates} products={db.productTypes} />;
}
