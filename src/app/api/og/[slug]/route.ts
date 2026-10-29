import sharp from "sharp";
import { getCatalogPublicMeta } from "@/lib/catalogMeta";
import { runWithFirestoreMetrics } from "@/lib/firestoreMetrics";

export const revalidate = 600;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const meta = await runWithFirestoreMetrics(`og:${slug}`, () => getCatalogPublicMeta(slug));
  if (!meta) return new Response("Not found", { status: 404 });
  const title = escapeXml(meta.catalog.title.ru);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#163a66"/>
    <text x="72" y="180" fill="#e6d3a1" font-size="28" font-family="DejaVu Sans" letter-spacing="6">BAHMAL HOME</text>
    <text x="72" y="320" fill="#f4efe6" font-size="72" font-family="DejaVu Serif">${title}</text>
    <text x="72" y="420" fill="#f4efe6" font-size="32" font-family="DejaVu Sans">${meta.count} дизайнов</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { "content-type": "image/png", "cache-control": "public, max-age=600" } });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}
