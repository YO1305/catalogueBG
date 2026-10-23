import { TemplateWizard } from "@/components/admin/TemplateScreens";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  await requireSession(["admin"]);
  const db = await getDb();
  return <TemplateWizard products={db.productTypes} />;
}
