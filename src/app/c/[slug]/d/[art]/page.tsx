import type { Metadata } from "next";
import { CatalogScreen } from "@/components/flipbook/CatalogScreen";
import { PinGate } from "@/components/flipbook/PinGate";
import { translate } from "@/lib/i18n";
import { loadCatalog } from "@/lib/loadCatalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; art: string }> }): Promise<Metadata> {
  const { slug, art } = await params;
  const loaded = await loadCatalog(slug);
  if (loaded.state !== "ready") return { title: art };
  const fabric = loaded.model.fabrics.find((item) => item.art.toLowerCase() === art.toLowerCase());
  const title = fabric ? `${fabric.name[loaded.model.catalog.defaultLang]} · ${fabric.art}` : art;
  return { title, openGraph: { title, images: [`/api/og/${slug}`] } };
}

export default async function DesignPage({ params }: { params: Promise<{ slug: string; art: string }> }) {
  const { slug, art } = await params;
  const loaded = await loadCatalog(slug);
  if (loaded.state === "missing") return <p className="p-10">{translate("ru", "catalog.searchEmpty")}</p>;
  if (loaded.state === "expired") return <p className="p-10">{translate("ru", "catalog.expired")}</p>;
  if (loaded.state === "pin") return <PinGate slug={loaded.slug} title={loaded.title.ru} />;
  const fabric = loaded.model.fabrics.find((item) => item.art.toLowerCase() === decodeURIComponent(art).toLowerCase());
  const qr = `/api/qr?text=${encodeURIComponent(`https://bahmal.uz/c/${slug}/d/${art}`)}`;
  return <CatalogScreen model={{ ...loaded.model, qr }} initialPage={0} initialArt={fabric?.id} />;
}
