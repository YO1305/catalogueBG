import assert from "node:assert/strict";
import test from "node:test";
import { parseDensity, parseWidths } from "./parseSpecs";

test("density range from a dash", () => {
  assert.deepEqual(parseDensity("120–125"), { min: 120, max: 125 });
  assert.deepEqual(parseDensity("120-125"), { min: 120, max: 125 });
});

test("density plus-minus", () => {
  assert.deepEqual(parseDensity("125±5"), { min: 120, max: 130 });
});

test("single density and widths", () => {
  assert.deepEqual(parseDensity("120"), { min: 120, max: 120 });
  assert.deepEqual(parseWidths("150 / 220 / 240"), [150, 220, 240]);
  assert.deepEqual(parseWidths("220"), [220]);
});

test("empty specs", () => {
  assert.equal(parseDensity("  "), null);
  assert.deepEqual(parseWidths(""), []);
});
