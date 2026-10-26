import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { catalogCoverMockup } from "@/lib/catalog";
import { loadCatalog } from "@/lib/loadCatalog";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const loaded = await loadCatalog(slug);
  if (loaded.state !== "ready") return new Response("Not found", { status: 404 });
  const { catalog, fabrics, pages, fabricTypes } = loaded.model;
  const cacheDir = path.join(process.cwd(), "data", "pdf-cache");
  const cacheFile = path.join(cacheDir, `${slug}-${catalog.updatedAt.replace(/[:.]/g, "-")}.pdf`);
  try {
    const cached = await readFile(cacheFile);
    return pdf(cached);
  } catch {
    // Build a fresh A4 file when the catalogue changed.
  }
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const sans = await pdfDoc.embedFont(await readFile(path.join(process.cwd(), "assets/fonts/DejaVuSans.ttf")));
  const serif = await pdfDoc.embedFont(await readFile(path.join(process.cwd(), "assets/fonts/DejaVuSerif.ttf")));
  const byId = new Map(fabrics.map((fabric) => [fabric.id, fabric]));
  for (const page of pages) {
    const sheet = pdfDoc.addPage([595.28, 841.89]);
    sheet.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.95, 0.93, 0.9) });
    if (page.kind === "cover") {
      sheet.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.09, 0.23, 0.4) });
      sheet.drawText("BAHMAL HOME", { x: 48, y: 760, size: 12, font: sans, color: rgb(0.9, 0.83, 0.63) });
      sheet.drawText(catalog.title.ru, { x: 48, y: 640, size: 36, font: serif, color: rgb(0.96, 0.94, 0.9) });
      sheet.drawText(`${fabrics.length} designs`, { x: 48, y: 90, size: 12, font: sans, color: rgb(0.9, 0.83, 0.63) });
    } else if (page.kind === "designs") {
      let top = 760;
      for (const id of page.fabricIds) {
        const fabric = byId.get(id);
        if (!fabric) continue;
        const mockup = catalogCoverMockup(fabric, catalog.showProductTypes);
        const image = await embed(pdfDoc, mockup?.url || mockup?.webUrl || "");
        if (image) sheet.drawImage(image, { x: 40, y: top - 220, width: 280, height: 200 });
        const typeName = fabricTypes.find((item) => item.id === fabric.fabricTypeId)?.name.ru ?? "";
        sheet.drawText(fabric.name.ru.slice(0, 42), { x: 340, y: top - 40, size: 16, font: serif, color: rgb(0.11, 0.1, 0.08) });
        sheet.drawText(fabric.art, { x: 340, y: top - 62, size: 10, font: sans, color: rgb(0.4, 0.36, 0.3) });
        sheet.drawText(`${typeName} · ${fabric.density} g/m2 · ${fabric.width} cm`, { x: 340, y: top - 84, size: 9, font: sans, color: rgb(0.2, 0.18, 0.15) });
        top -= 280;
      }
    } else if (page.kind === "back") {
      sheet.drawText(catalog.contacts.phone, { x: 48, y: 640, size: 16, font: sans, color: rgb(0.11, 0.1, 0.08) });
      sheet.drawText(catalog.contacts.telegram, { x: 48, y: 610, size: 14, font: sans, color: rgb(0.11, 0.1, 0.08) });
      sheet.drawText(catalog.contacts.address, { x: 48, y: 580, size: 12, font: sans, color: rgb(0.3, 0.27, 0.22) });
    } else {
      const label = page.kind === "section" ? page.groupId : "";
      sheet.drawText(label, { x: 48, y: 760, size: 28, font: serif, color: rgb(0.11, 0.1, 0.08) });
    }
    sheet.drawText(String(page.index + 1), { x: 540, y: 28, size: 9, font: sans, color: rgb(0.4, 0.36, 0.3) });
  }
  const bytes = Buffer.from(await pdfDoc.save());
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cacheFile, bytes);
  return pdf(bytes);
}

function pdf(bytes: Buffer) {
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": "attachment" } });
}

async function embed(pdfDoc: PDFDocument, url?: string) {
  if (!url || !url.startsWith("/")) return null;
  try {
    const file = await readFile(path.join(process.cwd(), "public", url));
    const png = await sharp(file).png().toBuffer();
    return pdfDoc.embedPng(png);
  } catch {
    return null;
  }
}
