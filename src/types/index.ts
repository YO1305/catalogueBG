export type Lang = "ru" | "en" | "uz";

/** ISO-8601 in the app. The Firebase adapter stores Firestore Timestamps. */
export type Timestamp = string;

export type Localized = { ru: string; en: string; uz: string };

export type Role = "admin" | "designer" | "manager";

/** Пункты меню админки; у admin всегда все. */
export type AdminSection =
  | "catalogs"
  | "fabrics"
  | "templates"
  | "leads"
  | "stats"
  | "settings"
  | "usage"
  | "access";

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

export type FabricView = "stack" | "drape" | "roll" | "flat_fold" | "swatch";

export type Mockup = {
  productType: string;
  templateId: string;
  url: string;
  thumbUrl: string;
  webUrl?: string;
  /** Главный мокап ткани для обложки карточки (изделие fabric). */
  isPrimary?: boolean;
  sameForAllAreas: boolean;
  areas: MockupAreaSettings[];
  engine: TemplateEngine;
  generatedAt: Timestamp;
};

export type Tone = "light" | "medium" | "dark";

export type FabricVariant = {
  id: string;
  name: string;
  design: FabricDesign;
  mockups: Mockup[];
  /** Тон крашеной ткани; средний тон — это основной рисунок ткани */
  tone?: Exclude<Tone, "medium">;
  /** Цвет этого тона для макетов тканой ткани */
  weaveColor?: string;
};

export type WeavePattern = "stripes" | "map" | "none";

export type FabricWeave = {
  color: string;
  correction: number;
  pattern: WeavePattern;
  stripes?: Array<{ widthCm: number; shiny: boolean }>;
  mapUrl?: string;
  mapWidthCm?: number;
};

export type FabricDesign = {
  originalUrl: string;
  webUrl: string;
  thumbUrl: string;
  widthPx: number;
  heightPx: number;
  seamless: boolean;
};

/** Раздел дизайнов: жаккардовые (тканый рисунок), однотонные (крашение, три тона), рисунок (печать, раппорт). */
export type FabricKind = "woven" | "dyed" | "printed";

export type Fabric = {
  id: string;
  /** Нет у старых записей — тогда раздел выводится из woven / toned. */
  kind?: FabricKind;
  art: string;
  collectionId: string;
  fabricTypeId: string;
  name: Localized;
  description: Localized;
  composition: Localized;
  /** Отделка из справочника; finish хранит её название для каталога */
  finishId?: string;
  /** Однотонные (крашение): три обязательных тона; ставится разделом kind = "dyed" */
  toned?: boolean;
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
  /** Старые ткани из конструктора полос; новые тканые ткани используют woven + weave */
  designMode?: "upload" | "stripes";
  stripes?: Array<{ widthCm: number; color: string; shiny: boolean }>;
  /** Тканый рисунок (жаккард, страйп-сатин): design — фото ткани, макеты — цвет + переплетение */
  woven?: boolean;
  weave?: FabricWeave;
  design: FabricDesign;
  realPhotos: Photo[];
  mockups: Mockup[];
  /** Название цвета основного рисунка, показывается рядом с вариантами */
  colorName?: string;
  /** Тот же дизайн в других цветах; макеты строятся с настройками основных */
  variants?: FabricVariant[];
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
  /** Узор в переплетении (страйп-сатин, жаккард, дамаск) — у ткани сразу ставится woven */
  woven?: boolean;
};

export type Finish = {
  id: string;
  name: Localized;
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
  /** Шаблон со слоями weave подходит и для тканых тканей, хотя finish = matte. */
  weaveCapable?: boolean;
  fabricView?: FabricView;
  texture?: string;
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

/** Позиция и начертание текста на обложке (проценты — от верха страницы). */
export type CatalogCoverTypography = {
  kickerWeight?: number;
  titleWeight?: number;
  subtitleWeight?: number;
  kickerOffsetPct?: number;
  titleOffsetPct?: number;
  subtitleOffsetPct?: number;
  /** Затемнение фото обложки 0–50 (0 = как загружено). */
  imageDimPct?: number;
  textOnImage?: "light" | "dark";
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
  /** Верхняя строка на обложке (например «BAHMAL HOME»). */
  coverKicker?: Localized;
  coverTypography?: CatalogCoverTypography;
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
    /** Масштаб поп-апа ткани в % (85–135), по умолчанию 100. */
    fabricModalScale?: number;
  };
  cover: { fabricId?: string; imageUrl?: string };
  showPrices: boolean;
  /** B2B: показывать вкладку «Рисунок» с плоским файлом (SPEC 5.8.5). */
  showFlatDesign?: boolean;
  access: "public" | "unlisted" | "pin";
  pinHash?: string;
  /** address is the Russian text; addressI18n holds EN/UZ versions typed in the editor */
  contacts: { phone: string; telegram: string; email: string; address: string; addressI18n?: Localized };
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
  /** Если задано — переопределяет разделы по умолчанию для роли (кроме admin). */
  sections?: AdminSection[];
};

export type Database = {
  collections: Collection[];
  fabricTypes: FabricType[];
  finishes?: Finish[];
  productTypes: ProductType[];
  templates: Template[];
  fabrics: Fabric[];
  catalogs: Catalog[];
  leads: Lead[];
  events: AnalyticsEvent[];
  users: AppUser[];
  glossary: GlossaryTerm[];
};

export type PublicUser = Pick<AppUser, "id" | "email" | "name" | "role" | "sections">;

export type BuiltPage =
  | { kind: "cover"; index: number }
  | { kind: "section"; index: number; group: "fabricType" | "collection"; groupId: string }
  | { kind: "designs"; index: number; fabricIds: string[] }
  | { kind: "back"; index: number };
