import { describe, expect, it } from "vitest";
import { buildPages } from "@/lib/catalog";
import { remobileDesignPages } from "@/lib/catalogMobilePages";
import type { Catalog, Fabric } from "@/types";

const baseCatalog: Catalog = {
  slug: "test",
  title: { ru: "T", en: "T", uz: "T" },
  subtitle: { ru: "", en: "", uz: "" },
  defaultLang: "ru",
  langs: ["ru"],
  mode: "manual",
  fabricIds: ["a", "b", "c", "d", "e"],
  showProductTypes: [],
  layout: { perPage: 3, sectionBy: "none", theme: "light" },
  cover: {},
  showPrices: false,
  access: "public",
  contacts: { phone: "", telegram: "", email: "", address: "" },
  status: "live",
  createdBy: "u",
  updatedAt: "",
};

const fabric = (id: string): Fabric =>
  ({
    id,
    art: id,
    name: { ru: id, en: id, uz: id },
    status: "published",
    mockups: [],
    productTypes: [],
  }) as Fabric;

describe("remobileDesignPages", () => {
  it("splits design pages into pairs on mobile", () => {
    const pages = buildPages(baseCatalog, ["a", "b", "c", "d", "e"].map(fabric));
    const mobile = remobileDesignPages(pages);
    const designPages = mobile.filter((p) => p.kind === "designs");
    expect(designPages).toHaveLength(3);
    expect(designPages[0]?.kind === "designs" && designPages[0].fabricIds).toEqual(["a", "b"]);
    expect(designPages[2]?.kind === "designs" && designPages[2].fabricIds).toEqual(["e"]);
  });
});
