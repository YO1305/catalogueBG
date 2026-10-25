import "server-only";
import { getFabric, isFabricArtTaken, saveFabric } from "@/lib/db";
import { parseDensity, parseWidths } from "@/lib/parseSpecs";
import type { Session } from "@/lib/session";
import { mergeVariants } from "@/lib/variants";
import type { Fabric } from "@/types";

export async function persistFabric(session: Session, fabric: Fabric) {
  const art = fabric.art.trim();
  const [taken, previous] = await Promise.all([isFabricArtTaken(art, fabric.id), getFabric(fabric.id)]);
  if (taken) return { ok: false as const, error: "art_taken" as const };
  const next: Fabric = {
    ...fabric,
    art,
    densityRange: parseDensity(fabric.density),
    widthList: parseWidths(fabric.width),
    mockups: mergeRenderedMockups(fabric.mockups, previous?.mockups ?? []),
    variants: mergeVariants(fabric.variants, previous?.variants),
    createdAt: previous?.createdAt ?? fabric.createdAt,
    createdBy: previous?.createdBy ?? session.uid,
    updatedAt: new Date().toISOString(),
  };
  await saveFabric(next);
  return { ok: true as const, fabric: next };
}

/** Keep server-rendered WebP URLs when the editor still holds the template thumbnail for an unchanged mockup. */
function mergeRenderedMockups(incoming: Fabric["mockups"], stored: Fabric["mockups"]): Fabric["mockups"] {
  return incoming.map((mockup) => {
    const saved = stored.find((item) => item.templateId === mockup.templateId && item.productType === mockup.productType);
    if (!saved?.webUrl || mockup.webUrl) return mockup;
    if (JSON.stringify(saved.areas) !== JSON.stringify(mockup.areas) || saved.sameForAllAreas !== mockup.sameForAllAreas) return mockup;
    return { ...mockup, url: saved.url, webUrl: saved.webUrl, thumbUrl: saved.thumbUrl, generatedAt: saved.generatedAt, engine: saved.engine };
  });
}
