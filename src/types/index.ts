export type Lang = "ru" | "en" | "uz";

/** ISO-8601 in the app. The Firebase adapter stores Firestore Timestamps. */
export type Timestamp = string;

export type Localized = { ru: string; en: string; uz: string };

export type Role = "admin" | "designer" | "manager";

/** Категория мокапа для фильтра в админке */
export type MockupCategory = "kitchen" | "bedding" | "kurpacha" | "fashion";

export type FabricStatus = "draft" | "published" | "archived";

export type Photo = {
  url: string;
  thumbUrl: string;
  alt?: Localized;
};

export type TemplateKind = "zip" | "psd" | "demo";

export type TemplateEngine = "webgl" | "photopea" | "uvgrid";

export type MockupAreaSettings = {
  areaId: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

export type Mockup = {
  productType: string;
  templateId: string;
  url: string;
  thumbUrl: string;
  webUrl?: string;
  sameForAllAreas: boolean;
  areas: MockupAreaSettings[];
  engine: TemplateEngine;
  generatedAt: Timestamp;
};

export type Fabric = {
  id: string;
  art: string;
  collectionId: string;
  fabricTypeId: string;
  name: Localized;
  description: Localized;
  composition: Localized;
  /** Доп. поля карточки (отделка) — необязательные */
  finish?: Localized;
  finishExtra?: Localized;
  density: string;
  width: string;
  densityRange: { min: number; max: number } | null;
  widthList: number[];
  rapport: { widthCm: number; heightCm: number };
  colors: string[];
  tags: string[];
  productTypes: string[];
  mockupCategory?: MockupCategory;
  design: {
    originalUrl: string;
    webUrl: string;
    thumbUrl: string;
    widthPx: number;
    heightPx: number;
    seamless: boolean;
  };
  realPhotos: Photo[];
  mockups: Mockup[];
  status: FabricStatus;
  isNew: boolean;
  priceVisible?: { uzs?: number; usd?: number };
  translationLocked: { name?: boolean; description?: boolean; composition?: boolean };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Collection = {
  id: string;
  name: Localized;
  slug: string;
  order: number;
  active: boolean;
  catalogSlug?: string;
};

export type FabricType = {
  id: string;
  name: Localized;
  suggestedProductTypes: string[];
  order: number;
  active: boolean;
};

export type ProductType = {
  id: string;
  name: Localized;
  suggestedFor: string[];
  order: number;
  active: boolean;
};

export type TemplateArea = {
  id: string;
  label: string;
  psdLayerPath: string;
  soWidthPx: number;
  soHeightPx: number;
  transform: number[];
  warp?: { bounds: number[]; cols: number; rows: number; points: number[] };
  maskUrl?: string;
  shadeUrl?: string;
  pxPerCm: number;
  realWidthCm: number;
  fill: boolean;
};

export type Template = {
  id: string;
  kind?: TemplateKind;
  category?: MockupCategory;
  productTypes: string[];
  name: string;
  finish?: "sateen" | "matte" | string;
  source: {
    psdUrl: string;
    fileName: string;
    sizeMb: number;
    widthPx: number;
    heightPx: number;
  };
  engine: TemplateEngine;
  compatibility: { ok: boolean; warnings: string[] };
  baked: {
    backgroundUrl: string;
    overlays: Array<{ url: string; blendMode: string; opacity: number; x: number; y: number }>;
    jsonUrl: string;
  };
  areas: TemplateArea[];
  thumbnailUrl: string;
  isDefault: boolean;
  order: number;
};

export type CatalogRules = {
  collections?: string[];
  fabricTypes?: string[];
  productTypes?: string[];
  tags?: string[];
  onlyNew?: boolean;
  publishedAfter?: Timestamp;
};

export type Catalog = {
  slug: string;
  title: Localized;
  subtitle: Localized;
  defaultLang: Lang;
  langs: Lang[];
  mode: "rules" | "manual";
  rules?: CatalogRules;
  fabricIds?: string[];
  showProductTypes: string[];
  layout: {
    perPage: 1 | 2 | 3 | 4;
    sectionBy: "none" | "fabricType" | "collection";
    theme: "light" | "dark" | "classic" | "sand";
  };
  cover: { fabricId?: string; imageUrl?: string };
  showPrices: boolean;
  access: "public" | "unlisted" | "pin";
  pinHash?: string;
  contacts: { phone: string; telegram: string; email: string; address: string };
  expiresAt?: Timestamp;
  status: "draft" | "live" | "archived";
  createdBy: string;
  updatedAt: Timestamp;
};

export type Lead = {
  id: string;
  catalogSlug: string;
  fabricId?: string;
  fabricIds?: string[];
  name: string;
  contact: string;
  message?: string;
  lang: Lang;
  createdAt: Timestamp;
  status: "new" | "in_work" | "done";
};

export type AnalyticsEvent = {
  id: string;
  catalogSlug: string;
  type: "open" | "page" | "fabric_open" | "zoom" | "share" | "pdf" | "lead";
  fabricId?: string;
  page?: number;
  ts: Timestamp;
  sessionId: string;
  country?: string;
};

export type GlossaryTerm = {
  id: string;
  ru: string;
  en: string;
  uz: string;
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
};

export type Database = {
  collections: Collection[];
  fabricTypes: FabricType[];
  productTypes: ProductType[];
  templates: Template[];
  fabrics: Fabric[];
  catalogs: Catalog[];
  leads: Lead[];
  events: AnalyticsEvent[];
  users: AppUser[];
  glossary: GlossaryTerm[];
};

export type PublicUser = Pick<AppUser, "id" | "email" | "name" | "role">;

export type BuiltPage =
  | { kind: "cover"; index: number }
  | {
      kind: "toc";
      index: number;
      entries: Array<{ target: number; label: "section" | "design" | "back"; id: string }>;
    }
  | { kind: "section"; index: number; group: "fabricType" | "collection"; groupId: string }
  | { kind: "designs"; index: number; fabricIds: string[] }
  | { kind: "back"; index: number };
