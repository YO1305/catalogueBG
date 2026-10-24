import { notFound } from "next/navigation";
import { FabricEditor } from "@/components/admin/FabricEditor";
import { requireSession } from "@/lib/auth";
import { getFabric, getFabricEditorData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditFabricPage({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireSession(["admin", "designer"]), params]);
  const [fabric, db] = await Promise.all([getFabric(id), getFabricEditorData()]);
  if (!fabric) notFound();
  return (
    <FabricEditor
      initial={fabric}
      isNew={false}
      catalogs={db.catalogs}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      templates={db.templates}
    />
  );
}
