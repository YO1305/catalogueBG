import { notFound } from "next/navigation";
import { FabricEditor } from "@/components/admin/FabricEditor";
import { requireSession } from "@/lib/auth";
import { getCatalogListData, getFabricEditorData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditFabricPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["admin", "designer"]);
  const { id } = await params;
  const { fabrics } = await getCatalogListData();
  const fabric = fabrics.find((item) => item.id === id);
  if (!fabric) notFound();
  const db = await getFabricEditorData();
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
