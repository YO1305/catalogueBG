import { TemplateWizard } from "@/components/admin/TemplateScreens";
import { requireSession } from "@/lib/auth";
import { getProductTypes } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  await requireSession(["admin"]);
  const products = await getProductTypes();
  return <TemplateWizard products={products} />;
}
