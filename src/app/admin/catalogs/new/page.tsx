import { CatalogCreateKindPick } from "@/components/admin/CatalogCreateKindPick";
import { CatalogEditor } from "@/components/admin/CatalogEditor";
import { requireSession } from "@/lib/auth";
import { isCatalogKind } from "@/lib/catalogKind";
import { emptyCatalogDraft } from "@/lib/catalogDraft";
import { getCatalogWorkspace } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewCatalogPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: kindRaw } = await searchParams;
  if (!isCatalogKind(kindRaw)) {
    await requireSession(["admin", "manager"]);
    return <CatalogCreateKindPick />;
  }
  const [session, workspace] = await Promise.all([requireSession(["admin", "manager"]), getCatalogWorkspace()]);
  const draft = emptyCatalogDraft();
  draft.catalogKind = kindRaw;
  draft.createdBy = session.uid;
  draft.showProductTypes =
    kindRaw === "design" ? [] : workspace.productTypes.filter((item) => item.active).map((item) => item.id);
  if (kindRaw === "design") draft.layout = { ...draft.layout, perPage: 2 };
  return (
    <CatalogEditor
      initial={draft}
      isNew
      fabrics={workspace.fabrics}
      collections={workspace.collections}
      fabricTypes={workspace.fabricTypes}
      productTypes={workspace.productTypes}
    />
  );
}
