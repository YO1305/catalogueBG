import { notFound } from "next/navigation";
import { CatalogBuilder } from "@/components/admin/CatalogDesk";
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
  return <CatalogBuilder initial={safe} fabrics={db.fabrics} collections={db.collections} fabricTypes={db.fabricTypes} productTypes={db.productTypes} />;
}
