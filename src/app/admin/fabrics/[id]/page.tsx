import { notFound } from "next/navigation";
import { FabricWizard } from "@/components/admin/FabricWizard";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditFabricPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["admin", "designer"]);
  const { id } = await params;
  const db = await getDb();
  const fabric = db.fabrics.find((item) => item.id === id);
  if (!fabric) notFound();
  return <FabricWizard initial={fabric} collections={db.collections} fabricTypes={db.fabricTypes} productTypes={db.productTypes} templates={db.templates} glossary={db.glossary} />;
}
