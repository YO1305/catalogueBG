import { CatalogEditor } from "@/components/admin/CatalogEditor";
import { requireSession } from "@/lib/auth";
import { emptyCatalogDraft } from "@/lib/catalogDraft";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewCatalogPage() {
  const session = await requireSession(["admin", "manager", "designer"]);
  const db = await getDb();
  const draft = emptyCatalogDraft();
  draft.createdBy = session.uid;
  draft.showProductTypes = db.productTypes.filter((item) => item.active).map((item) => item.id);
  return (
    <CatalogEditor
      initial={draft}
      isNew
      fabrics={db.fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
    />
  );
}
