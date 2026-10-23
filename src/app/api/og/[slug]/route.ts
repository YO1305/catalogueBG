import sharp from "sharp";
import { resolveFabrics } from "@/lib/catalog";
import { getDb } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const db = await getDb();
  const catalog = db.catalogs.find((item) => item.slug === slug);
  if (!catalog) return new Response("Not found", { status: 404 });
  const count = resolveFabrics(catalog, db.fabrics).length;
  const title = escapeXml(catalog.title.ru);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#163a66"/>
    <text x="72" y="180" fill="#e6d3a1" font-size="28" font-family="DejaVu Sans" letter-spacing="6">BAHMAL HOME</text>
    <text x="72" y="320" fill="#f4efe6" font-size="72" font-family="DejaVu Serif">${title}</text>
    <text x="72" y="420" fill="#f4efe6" font-size="32" font-family="DejaVu Sans">${count} дизайнов</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { "content-type": "image/png", "cache-control": "public, max-age=300" } });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}
