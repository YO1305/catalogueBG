import { FabricEditor } from "@/components/admin/FabricEditor";
import { requireSession } from "@/lib/auth";
import { getFabricEditorData } from "@/lib/db";
import { emptyFabric } from "@/lib/fabricDraft";

export const dynamic = "force-dynamic";

export default async function NewFabricPage() {
  const [session, db] = await Promise.all([requireSession(["admin", "designer"]), getFabricEditorData()]);
  const initial = emptyFabric(session.uid);
  return (
    <FabricEditor
      initial={initial}
      isNew
      catalogs={db.catalogs}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
      templates={db.templates}
    />
  );
}
