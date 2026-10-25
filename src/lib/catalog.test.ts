import assert from "node:assert/strict";
import test from "node:test";
import { buildPages, heroMockup, resolveFabrics } from "./catalog";
import type { Catalog, Fabric, Mockup } from "../types";

function fabric(partial: Partial<Fabric> & Pick<Fabric, "id" | "art">): Fabric {
  return {
    collectionId: "internal",
    fabricTypeId: "sateen",
    name: { ru: partial.art, en: partial.art, uz: partial.art },
    description: { ru: "", en: "", uz: "" },
    composition: { ru: "", en: "", uz: "" },
    density: "120",
    width: "220",
    densityRange: { min: 120, max: 120 },
    widthList: [220],
    rapport: { widthCm: 32, heightCm: 32 },
    colors: [],
    tags: [],
    productTypes: ["kpb"],
    design: { originalUrl: "", webUrl: "", thumbUrl: "", widthPx: 1, heightPx: 1, seamless: true },
    realPhotos: [],
    mockups: [],
    status: "published",
    isNew: false,
    translationLocked: {},
    createdBy: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function catalog(partial: Partial<Catalog>): Catalog {
  return {
    slug: "demo",
    title: { ru: "Демо", en: "Demo", uz: "Demo" },
    subtitle: { ru: "", en: "", uz: "" },
    defaultLang: "ru",
    langs: ["ru", "en", "uz"],
    mode: "rules",
    rules: {},
    showProductTypes: ["kurpacha", "pillow"],
    layout: { perPage: 2, sectionBy: "none", theme: "light" },
    cover: {},
    showPrices: false,
    access: "public",
    contacts: { phone: "", telegram: "", email: "", address: "" },
    status: "live",
    createdBy: "test",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("rules catalog keeps only matching published fabrics", () => {
  const items = [
    fabric({ id: "a", art: "KR-1", productTypes: ["kurpacha"], fabricTypeId: "kurpacha-fabric" }),
    fabric({ id: "b", art: "ST-1", productTypes: ["kpb"], fabricTypeId: "sateen" }),
    fabric({ id: "c", art: "KR-2", productTypes: ["kurpacha"], status: "draft" }),
  ];
  const selected = resolveFabrics(
    catalog({ rules: { productTypes: ["kurpacha"] }, showProductTypes: ["kurpacha", "pillow"] }),
    items,
  );
  assert.deepEqual(selected.map((item) => item.id), ["a"]);
});

test("kurpacha catalog hero ignores bed mockups", () => {
  const mockups: Mockup[] = [
    { productType: "kpb", templateId: "bed", url: "bed", thumbUrl: "bed", sameForAllAreas: true, areas: [], engine: "webgl", generatedAt: "2026-01-01T00:00:00.000Z" },
    { productType: "kurpacha", templateId: "floor", url: "floor", thumbUrl: "floor", sameForAllAreas: true, areas: [], engine: "webgl", generatedAt: "2026-01-01T00:00:00.000Z" },
  ];
  const item = fabric({ id: "a", art: "KR-1", mockups, productTypes: ["kpb", "kurpacha"] });
  assert.equal(heroMockup(item, ["kurpacha", "pillow"])?.templateId, "floor");
});

test("buildPages makes a cover, contents, design pages and a back cover", () => {
  const items = ["A", "B", "C", "D"].map((art) => fabric({ id: art.toLowerCase(), art }));
  const pages = buildPages(catalog({ layout: { perPage: 2, sectionBy: "none", theme: "light" } }), items);
  assert.deepEqual(pages.map((page) => page.kind), ["cover", "toc", "designs", "designs", "back"]);
  const designs = pages.filter((page) => page.kind === "designs");
  assert.equal(designs[0] && designs[0].kind === "designs" ? designs[0].fabricIds.length : 0, 3);
});
