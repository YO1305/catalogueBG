import assert from "node:assert/strict";
import test from "node:test";
import { fitRenderSize } from "./scaleManifest";

test("fitRenderSize keeps frames that already fit", () => {
  assert.deepEqual(fitRenderSize(1600, 1200, 2000), { width: 1600, height: 1200 });
});

test("fitRenderSize caps the long side at 2000", () => {
  assert.deepEqual(fitRenderSize(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(fitRenderSize(3000, 4000, 2000), { width: 1500, height: 2000 });
});
