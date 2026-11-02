import assert from "node:assert/strict";
import test from "node:test";
import { catalogDesignPreviewSrc, savedMockups } from "./catalog";
import { sanitizePublicFabric } from "./publicFabric";
import type { Catalog, Fabric, Mockup } from "../types";

const design = {
  originalUrl: "https://blob.example/private/designs/abc/source.tif",
  webUrl: "https://blob.example/private/designs/abc/web.webp",
  thumbUrl: "https://blob.example/private/designs/abc/thumb.webp",
  viewUrl: "https://blob.example/designs/abc/view-2000.webp",
  widthPx: 4000,
  heightPx: 3000,
  seamless: true,
};

const saved: Mockup = {
  productType: "kpb",
  templateId: "bed",
  url: "https://blob.example/mockups/bed.webp",
  webUrl: "https://blob.example/mockups/bed.webp",
  thumbUrl: "https://blob.example/mockups/bed-thumb.webp",
  sameForAllAreas: true,
  areas: [],
  engine: "uvgrid",
  generatedAt: "2026-01-01T00:00:00.000Z",
  isPrimary: true,
};

function fabric(): Fabric {
  return {
    id: "f1",
    art: "P220",
    collectionId: "",
    fabricTypeId: "",
    name: { ru: "ткань", en: "", uz: "" },
    description: { ru: "", en: "", uz: "" },
    composition: { ru: "", en: "", uz: "" },
    density: "",
    width: "220",
    densityRange: { min: 0, max: 0 },
    widthList: [],
    rapport: { widthCm: 32, heightCm: 32 },
    colors: [],
    tags: [],
    productTypes: ["kpb"],
    design,
    realPhotos: [],
    mockups: [saved],
    status: "published",
    isNew: false,
    translationLocked: {},
    createdBy: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    designCatalogEntry: true,
  };
}

function gate(access: Catalog["access"], showFlatDesign = false): Pick<Catalog, "access" | "showFlatDesign"> {
  return { access, showFlatDesign };
}

test("public payload never includes the flat artwork", () => {
  const next = sanitizePublicFabric(fabric(), gate("public", true));
  assert.equal(next.design.webUrl, "");
  assert.equal(next.design.thumbUrl, "");
  assert.equal(next.design.originalUrl, "");
  assert.equal(next.design.viewUrl, "");
  assert.equal(next.mockups[0]?.webUrl, saved.webUrl);
});

test("flat artwork stays only for a PIN catalogue with showFlatDesign", () => {
  assert.equal(sanitizePublicFabric(fabric(), gate("pin", false)).design.webUrl, "");
  assert.equal(sanitizePublicFabric(fabric(), gate("pin", true)).design.webUrl, design.webUrl);
});

test("journal tile is the saved primary mockup, not the artwork", () => {
  const item = fabric();
  assert.equal(savedMockups(item)[0]?.webUrl, saved.webUrl);
  assert.equal(catalogDesignPreviewSrc(item, { access: "public" } as Catalog, []), saved.webUrl);
  assert.equal(catalogDesignPreviewSrc(item, { access: "public" } as Catalog, []).includes("private/designs"), false);
});
