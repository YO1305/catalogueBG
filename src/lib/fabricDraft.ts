import { kindFields } from "@/lib/fabricKind";
import type { Fabric, FabricKind } from "@/types";

export function emptyFabric(userId: string, kind: FabricKind = "printed"): Fabric {
  const now = new Date().toISOString();
  return {
    ...kindFields(kind, {}),
    id: crypto.randomUUID(),
    art: "",
    collectionId: "",
    fabricTypeId: "",
    name: { ru: "", en: "", uz: "" },
    description: { ru: "", en: "", uz: "" },
    composition: { ru: "", en: "", uz: "" },
    finish: { ru: "", en: "", uz: "" },
    finishExtra: { ru: "", en: "", uz: "" },
    density: "",
    width: "",
    densityRange: null,
    widthList: [],
    rapport: { widthCm: 0, heightCm: 0 },
    colors: [],
    tags: [],
    productTypes: [],
    mockupCategory: "bedding",
    design: { originalUrl: "", webUrl: "", thumbUrl: "", widthPx: 0, heightPx: 0, seamless: kind === "printed" },
    realPhotos: [],
    mockups: [],
    status: "draft",
    isNew: false,
    translationLocked: {},
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    persisted: false,
  };
}

export function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
