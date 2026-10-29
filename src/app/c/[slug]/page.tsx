import type { Metadata } from "next";
import { CatalogScreen } from "@/components/flipbook/CatalogScreen";
import { PinGate } from "@/components/flipbook/PinGate";
import { getCatalogPublicMeta } from "@/lib/catalogMeta";
import { runWithFirestoreMetrics } from "@/lib/firestoreMetrics";
import { translate } from "@/lib/i18n";
import { loadCatalog } from "@/lib/loadCatalog";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getCatalogPublicMeta(slug);
  if (!meta) return { title: "BAHMAL HOME" };
  const { catalog, count } = meta;
  const title = catalog.title[catalog.defaultLang];
  return {
    title,
    description: translate(catalog.defaultLang, "home.designs", { count }),
    openGraph: { title, description: translate(catalog.defaultLang, "home.designs", { count }), images: [`/api/og/${slug}`] },
  };
}

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await runWithFirestoreMetrics(`catalog:${slug}`, () => loadCatalog(slug));
  if (loaded.state === "missing") return <p className="p-10">{translate("ru", "catalog.searchEmpty")}</p>;
  if (loaded.state === "expired") return <p className="p-10 font-display text-3xl">{translate("ru", "catalog.expired")}</p>;
  if (loaded.state === "pin") return <PinGate slug={loaded.slug} title={loaded.title.ru} />;
  const qr = `/api/qr?text=${encodeURIComponent(`https://bahmal.uz/c/${slug}`)}`;
  return <CatalogScreen model={{ ...loaded.model, qr }} initialPage={0} />;
}
