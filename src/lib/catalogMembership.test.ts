import assert from "node:assert/strict";
import test from "node:test";
import { catalogAssignFabric, catalogPickDiff, catalogSlugDiff, catalogWithoutFabric, picksWithFabric } from "./catalogMembership";
import type { Catalog } from "../types";

function catalog(partial: Partial<Catalog> & Pick<Catalog, "slug">): Catalog {
  return {
    title: { ru: partial.slug, en: "", uz: "" },
    subtitle: { ru: "", en: "", uz: "" },
    defaultLang: "ru",
    langs: ["ru"],
    mode: "manual",
    showProductTypes: [],
    layout: { perPage: 2, sectionBy: "none", theme: "light" },
    cover: {},
    showPrices: false,
    access: "unlisted",
    contacts: { phone: "", telegram: "", email: "", address: "" },
    status: "live",
    createdBy: "test",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("catalog diff is only what changed", () => {
  assert.deepEqual(catalogSlugDiff(["a", "b"], ["b", "c"]), { add: ["c"], remove: ["a"] });
  assert.deepEqual(catalogSlugDiff(["a"], ["a"]), { add: [], remove: [] });
});

test("removing a fabric drops it from sections and the flat list", () => {
  const next = catalogWithoutFabric(
    catalog({
      slug: "gold",
      fabricIds: ["keep", "drop"],
      catalogSections: [
        { id: "s1", title: { ru: "Gold", en: "", uz: "" }, fabricIds: ["drop", "keep"] },
        { id: "s2", title: { ru: "Silver", en: "", uz: "" }, fabricIds: ["other"] },
      ],
    }),
    "drop",
  );
  assert.deepEqual(next.fabricIds, ["keep", "other"]);
  assert.deepEqual(next.catalogSections?.[0]?.fabricIds, ["keep"]);
  assert.equal(picksWithFabric([next], "drop").length, 0);
  assert.deepEqual(picksWithFabric([next], "keep"), [{ slug: "gold", sectionId: "s1" }]);
});

test("assign moves a fabric into another section and can leave it without one", () => {
  const base = catalog({
    slug: "gold",
    fabricIds: ["a"],
    catalogSections: [
      { id: "s1", title: { ru: "Gold", en: "", uz: "" }, fabricIds: ["a"] },
      { id: "s2", title: { ru: "Silver", en: "", uz: "" }, fabricIds: [] },
    ],
  });
  const moved = catalogAssignFabric(base, "a", "s2");
  assert.deepEqual(moved.catalogSections?.[0]?.fabricIds, []);
  assert.deepEqual(moved.catalogSections?.[1]?.fabricIds, ["a"]);
  const loose = catalogAssignFabric(moved, "a", null);
  assert.deepEqual(loose.catalogSections?.flatMap((section) => section.fabricIds), []);
  assert.equal(loose.fabricIds?.includes("a"), true);
  assert.deepEqual(catalogPickDiff([{ slug: "gold", sectionId: "s1" }], [{ slug: "gold", sectionId: "s2" }]), {
    assign: [{ slug: "gold", sectionId: "s2" }],
    remove: [],
  });
});
