import { FabricEditor } from "@/components/admin/FabricEditor";
import { requireSession } from "@/lib/auth";
import { getFabricEditorData } from "@/lib/db";
import { emptyFabric } from "@/lib/fabricDraft";
import { isFabricKind } from "@/lib/fabricKind";

export const dynamic = "force-dynamic";

export default async function NewFabricPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const [session, db, query] = await Promise.all([requireSession(["admin", "designer"]), getFabricEditorData(), searchParams]);
  const initial = emptyFabric(session.uid, isFabricKind(query.kind) ? query.kind : "printed");
  return (
    <FabricEditor
      initial={initial}
      isNew
      catalogs={db.catalogs}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      finishes={db.finishes}
      productTypes={db.productTypes}
      templates={db.templates}
    />
  );
}
