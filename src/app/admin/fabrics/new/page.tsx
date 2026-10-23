import { FabricWizard } from "@/components/admin/FabricWizard";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { emptyFabric } from "@/lib/fabricDraft";

export const dynamic = "force-dynamic";

export default async function NewFabricPage() {
  const session = await requireSession(["admin", "designer"]);
  const db = await getDb();
  return <FabricWizard initial={emptyFabric(session.uid)} collections={db.collections} fabricTypes={db.fabricTypes} productTypes={db.productTypes} templates={db.templates} glossary={db.glossary} />;
}
