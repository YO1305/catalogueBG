import assert from "node:assert/strict";
import test from "node:test";
import { catalogSlugDiff, catalogWithoutFabric, slugsWithFabric } from "./catalogMembership";
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
  assert.equal(slugsWithFabric([next], "drop").length, 0);
  assert.deepEqual(slugsWithFabric([next], "keep"), ["gold"]);
});
