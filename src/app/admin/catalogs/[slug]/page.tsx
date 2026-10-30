import { notFound } from "next/navigation";
import { CatalogEditor } from "@/components/admin/CatalogEditor";
import { requireSession } from "@/lib/auth";
import { getCatalogWorkspace } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const [, { slug }] = await Promise.all([requireSession(["admin", "manager"]), params]);
  const workspace = await getCatalogWorkspace(slug);
  if (!workspace.catalog) notFound();
  const { pinHash: _pin, ...safe } = workspace.catalog;
  return (
    <CatalogEditor
      initial={safe}
      isNew={false}
      fabrics={workspace.fabrics}
      collections={workspace.collections}
      fabricTypes={workspace.fabricTypes}
      productTypes={workspace.productTypes}
    />
  );
}
