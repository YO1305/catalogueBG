import "server-only";
import sharp from "sharp";
import { isPrivateDesignUrl } from "@/lib/designCatalog";
import { readBuffer, saveBuffer } from "@/lib/storage";
import type { Fabric, FabricDesign } from "@/types";

const FILE_ID = /\/private\/designs\/([0-9a-f-]{36})\//i;

function designFileId(url: string) {
  return FILE_ID.exec(url)?.[1] ?? "";
}

function viewPath(fileId: string) {
  return `designs/${fileId}/view-2000.webp`;
}

/** Same host as the stored blob URL, pathname swapped to the public 2000px file. */
export function derivedDesignViewUrl(sourceUrl: string, fileId: string): string | null {
  if (!sourceUrl.startsWith("http")) return `/${viewPath(fileId)}`;
  try {
    const url = new URL(sourceUrl);
    url.pathname = `/${viewPath(fileId)}`;
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function viewAlreadyStored(sourceUrl: string, fileId: string): Promise<string | null> {
  const target = derivedDesignViewUrl(sourceUrl, fileId);
  if (!target) return null;
  if (!target.startsWith("http")) {
    const local = await readBuffer(viewPath(fileId));
    return local ? target : null;
  }
  const head = await fetch(target, { method: "HEAD", cache: "no-store" }).catch(() => null);
  return head?.ok ? target : null;
}

async function loadDesignBytes(source: string): Promise<Buffer | null> {
  if (!source.startsWith("http")) return readBuffer(source.replace(/^\/+/, ""));
  const response = await fetch(source).catch(() => null);
  if (!response?.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}
export async function ensureDesignViewUrl(design: FabricDesign): Promise<string> {
  if (design.viewUrl && !isPrivateDesignUrl(design.viewUrl)) return design.viewUrl;
  const source = design.webUrl || design.originalUrl || design.thumbUrl;
  if (!source) return "";
  const fileId = designFileId(source) || designFileId(design.thumbUrl) || designFileId(design.originalUrl);
  if (!fileId) return design.thumbUrl || "";
  const existing = await viewAlreadyStored(source, fileId);
  if (existing) return existing;
  const input = await loadDesignBytes(source);
  if (!input) return design.thumbUrl || "";
  const web = await sharp(input, { limitInputPixels: false })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return saveBuffer(viewPath(fileId), web, "image/webp");
}

async function designWithView(design: FabricDesign): Promise<FabricDesign> {
  if (!design?.webUrl && !design?.thumbUrl && !design?.viewUrl) return design;
  const viewUrl = await ensureDesignViewUrl(design);
  return viewUrl ? { ...design, viewUrl } : design;
}

async function fabricWithViews(fabric: Fabric): Promise<Fabric> {
  const design = await designWithView(fabric.design);
  if (!fabric.variants?.length) return { ...fabric, design };
  const variants: NonNullable<Fabric["variants"]> = [];
  for (const variant of fabric.variants) {
    variants.push({ ...variant, design: await designWithView(variant.design) });
  }
  return { ...fabric, design, variants };
}

export async function ensureCatalogDesignViews(fabrics: Fabric[]): Promise<Fabric[]> {
  const out: Fabric[] = new Array(fabrics.length);
  let cursor = 0;
  async function worker() {
    while (cursor < fabrics.length) {
      const index = cursor;
      cursor += 1;
      const fabric = fabrics[index];
      if (!fabric) continue;
      try {
        out[index] = await fabricWithViews(fabric);
      } catch (error) {
        console.error("design view", fabric.id, error);
        out[index] = fabric;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, fabrics.length) }, () => worker()));
  return out;
}
