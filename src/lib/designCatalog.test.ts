import assert from "node:assert/strict";
import test from "node:test";
import { designCatalogPublicDesign } from "./designCatalog";
import type { FabricDesign } from "../types";

const design: FabricDesign = {
  originalUrl: "https://blob.example/private/designs/abc/source.tif",
  webUrl: "https://blob.example/private/designs/abc/web.webp",
  thumbUrl: "https://blob.example/private/designs/abc/thumb.webp",
  viewUrl: "https://blob.example/designs/abc/view-2000.webp",
  widthPx: 4000,
  heightPx: 3000,
  seamless: true,
};

test("design catalogue public image is the 2000px copy, not the original", () => {
  const next = designCatalogPublicDesign(design);
  assert.equal(next.webUrl, design.viewUrl);
  assert.equal(next.thumbUrl, design.viewUrl);
  assert.equal(next.originalUrl, "");
  assert.equal(next.webUrl.includes("/private/designs/"), false);
  assert.equal(next.thumbUrl.includes("/private/designs/"), false);
});

test("without a public view, the modal falls back to the thumb instead of the 4000px master", () => {
  const next = designCatalogPublicDesign({ ...design, viewUrl: undefined });
  assert.equal(next.webUrl, design.thumbUrl);
  assert.equal(next.originalUrl, "");
});
