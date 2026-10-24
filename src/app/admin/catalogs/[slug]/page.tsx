import { notFound } from "next/navigation";
import { CatalogEditor } from "@/components/admin/CatalogEditor";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CatalogEditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession(["admin", "manager"]);
  const { slug } = await params;
  const db = await getDb();
  const catalog = db.catalogs.find((item) => item.slug === slug);
  if (!catalog) notFound();
  const { pinHash: _pin, ...safe } = catalog;
  return (
    <CatalogEditor
      initial={safe}
      isNew={false}
      fabrics={db.fabrics}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      productTypes={db.productTypes}
    />
  );
}
