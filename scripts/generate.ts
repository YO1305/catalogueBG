import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { writePsdBuffer } from "ag-psd";
import sharp from "sharp";
import { hashPin } from "../src/lib/password.ts";
import { parseDensity, parseWidths } from "../src/lib/parseSpecs.ts";
import type { Catalog, Collection, Database, Fabric, FabricType, GlossaryTerm, Mockup, ProductType, Template, TemplateArea } from "../src/types/index.ts";

const root = process.cwd();
const publicDir = path.join(root, "public");
const now = "2026-10-01T09:00:00.000Z";

const loc = (ru: string, en: string, uz: string) => ({ ru, en, uz });

function svg(body: string, width = 800, height = 800) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

function petals(cx: number, cy: number, count: number, radius: number, color: string, rx = 18, ry = 48) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (360 / count) * index;
    return `<ellipse cx="${cx}" cy="${cy - radius}" rx="${rx}" ry="${ry}" fill="${color}" transform="rotate(${angle} ${cx} ${cy})"/>`;
  }).join("");
}

const patterns: Record<string, { svg: string; colors: string[] }> = {
  khiva: {
    colors: ["#0e3a5d", "#d4bc84", "#f4efe6", "#8e2f3a"],
    svg: svg(`<rect width="800" height="800" fill="#0e3a5d"/>${petals(400, 400, 16, 150, "#1f5f8a", 22, 70)}${petals(400, 400, 12, 90, "#d4bc84", 16, 48)}<circle cx="400" cy="400" r="36" fill="#f4efe6"/><circle cx="400" cy="400" r="14" fill="#8e2f3a"/>`),
  },
  bukhara: {
    colors: ["#6e1d2a", "#e6c27a", "#f7efe4", "#2b1216"],
    svg: svg(`<rect width="800" height="800" fill="#6e1d2a"/>${petals(400, 400, 10, 160, "#8f303c", 28, 80)}<circle cx="400" cy="400" r="70" fill="none" stroke="#e6c27a" stroke-width="8"/><circle cx="400" cy="400" r="28" fill="#e6c27a"/>`),
  },
  lavanda: {
    colors: ["#efe6f2", "#7d6b9a", "#c7b4d6", "#f7f4ef"],
    svg: svg(`<rect width="800" height="800" fill="#f4eef6"/>${petals(400, 400, 8, 120, "#c7b4d6", 26, 60)}<circle cx="400" cy="400" r="18" fill="#7d6b9a"/>`),
  },
  samarkand: {
    colors: ["#f7f4ef", "#163a66", "#9bb0c9"],
    svg: svg(`<rect width="800" height="800" fill="#f7f4ef"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 100}" y="0" width="${i % 2 ? 36 : 18}" height="800" fill="${i % 2 ? "#163a66" : "#9bb0c9"}"/>`).join("")}`),
  },
  nile: {
    colors: ["#e7f0ea", "#1f6f6a", "#d4bc84"],
    svg: svg(`<rect width="800" height="800" fill="#e7f0ea"/>${Array.from({ length: 10 }, (_, i) => `<rect x="0" y="${i * 80}" width="800" height="24" fill="${i % 2 ? "#1f6f6a" : "#d4bc84"}"/>`).join("")}`),
  },
  morning: {
    colors: ["#f7f3ea", "#6d8f71", "#d7c4a3"],
    svg: svg(`<rect width="800" height="800" fill="#f7f3ea"/>${Array.from({ length: 6 }, (_, i) => petals(140 + (i % 3) * 260, 180 + Math.floor(i / 3) * 420, 6, 36, "#6d8f71", 10, 22)).join("")}`),
  },
  mint: {
    colors: ["#e7f4ef", "#b7d8cf", "#f7fffc"],
    svg: svg(`<rect width="800" height="800" fill="#e7f4ef"/>${Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => `<rect x="${x * 100 + 18}" y="${y * 100 + 18}" width="64" height="64" fill="none" stroke="#b7d8cf" stroke-width="8"/>`).join("")).join("")}`),
  },
  sand: {
    colors: ["#e7d7c3", "#c8ae90", "#f6efe6"],
    svg: svg(`<rect width="800" height="800" fill="#e7d7c3"/>${Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 97) % 800}" cy="${(i * 53) % 800}" r="16" fill="#f6efe6" opacity="0.8"/>`).join("")}`),
  },
  ikat: {
    colors: ["#1c1915", "#c4553a", "#e6c27a", "#f4efe6"],
    svg: svg(`<rect width="800" height="800" fill="#f4efe6"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${i * 120} 0 C ${i * 120 + 40} 200, ${i * 120 - 30} 400, ${i * 120 + 20} 800" stroke="${i % 2 ? "#c4553a" : "#1c1915"}" stroke-width="46" fill="none"/>`).join("")}`),
  },
  night: {
    colors: ["#16141a", "#d4bc84", "#3a3344"],
    svg: svg(`<rect width="800" height="800" fill="#16141a"/>${petals(400, 400, 8, 130, "#3a3344", 20, 70)}<circle cx="400" cy="400" r="24" fill="#d4bc84"/>`),
  },
  kids: {
    colors: ["#fff8e8", "#f0c36a", "#7eb0d6"],
    svg: svg(`<rect width="800" height="800" fill="#fff8e8"/>${Array.from({ length: 9 }, (_, i) => `<circle cx="${120 + (i % 3) * 280}" cy="${140 + Math.floor(i / 3) * 260}" r="28" fill="${i % 2 ? "#7eb0d6" : "#f0c36a"}"/>`).join("")}`),
  },
  duck: {
    colors: ["#efe6d4", "#8c7a55", "#f7f1e4"],
    svg: svg(`<rect width="800" height="800" fill="#efe6d4"/><path d="M0 400 H800 M400 0 V800" stroke="#8c7a55" stroke-width="6"/><circle cx="400" cy="400" r="80" fill="none" stroke="#8c7a55" stroke-width="10"/>`),
  },
  cloud: {
    colors: ["#f4f1ec", "#d5d0c8"],
    svg: svg(`<rect width="800" height="800" fill="#f4f1ec"/>${petals(400, 400, 8, 80, "#d5d0c8", 20, 40)}`),
  },
};

type Scene = { id: string; name: string; products: string[]; isDefault: boolean; shapes: string; tile: number; areas: TemplateArea[] };

function area(id: string, label: string, transform: number[], realWidthCm: number): TemplateArea {
  const xs = [transform[0]!, transform[2]!, transform[4]!, transform[6]!];
  const width = Math.max(...xs) - Math.min(...xs);
  return { id, label, psdLayerPath: label, soWidthPx: Math.round(width), soHeightPx: Math.round(width * 0.72), transform, pxPerCm: width / realWidthCm, realWidthCm, fill: true };
}

const scenes: Scene[] = [
  { id: "bedroom-light", name: "Спальня светлая, вид 3/4", products: ["kpb", "duvet", "sheet", "pillowcase"], isDefault: true, tile: 150, shapes: `<polygon points="430,360 1180,330 1240,800 390,830" fill="url(#fab)"/><polygon points="470,280 720,270 740,430 460,450" fill="url(#fab)"/><polygon points="860,270 1160,250 1180,410 880,440" fill="url(#fab)"/>`, areas: [area("duvet", "Пододеяльник", [430, 360, 1180, 330, 1240, 800, 390, 830], 200), area("pillow-l", "Подушка левая", [470, 280, 720, 270, 740, 430, 460, 450], 50), area("pillow-r", "Подушка правая", [860, 270, 1160, 250, 1180, 410, 880, 440], 50)] },
  { id: "bedroom-dark", name: "Спальня тёмная", products: ["kpb"], isDefault: false, tile: 150, shapes: `<polygon points="430,360 1180,330 1240,800 390,830" fill="url(#fab)"/>`, areas: [area("duvet", "Пододеяльник", [430, 360, 1180, 330, 1240, 800, 390, 830], 200)] },
  { id: "bedroom-top", name: "Кровать сверху", products: ["duvet", "sheet"], isDefault: true, tile: 140, shapes: `<polygon points="360,220 1140,220 1140,820 360,820" fill="url(#fab)"/>`, areas: [area("top", "Полотно", [360, 220, 1140, 220, 1140, 820, 360, 820], 220)] },
  { id: "kurpacha-room", name: "Курпача в комнате", products: ["kurpacha"], isDefault: true, tile: 160, shapes: `<polygon points="280,460 1220,420 1280,860 240,900" fill="url(#fab)"/>`, areas: [area("body", "Курпача", [280, 460, 1220, 420, 1280, 860, 240, 900], 200)] },
  { id: "kurpacha-terrace", name: "Курпача на террасе", products: ["kurpacha"], isDefault: false, tile: 160, shapes: `<polygon points="300,480 1200,450 1240,880 260,900" fill="url(#fab)"/>`, areas: [area("body", "Курпача", [300, 480, 1200, 450, 1240, 880, 260, 900], 200)] },
  { id: "pillow-sofa", name: "Подушка на диване", products: ["pillow"], isDefault: true, tile: 130, shapes: `<polygon points="480,300 1040,270 1100,740 420,770" fill="url(#fab)"/>`, areas: [area("cushion", "Подушка", [480, 300, 1040, 270, 1100, 740, 420, 770], 60)] },
  { id: "pillow-bed", name: "Подушка на кровати", products: ["pillow", "pillowcase"], isDefault: false, tile: 120, shapes: `<polygon points="500,280 1080,260 1120,700 460,730" fill="url(#fab)"/>`, areas: [area("cushion", "Подушка", [500, 280, 1080, 260, 1120, 700, 460, 730], 50)] },
  { id: "towel-bath", name: "Полотенце в ванной", products: ["towel"], isDefault: true, tile: 90, shapes: `<polygon points="620,160 980,160 1000,860 600,860" fill="url(#fab)"/>`, areas: [area("towel", "Полотенце", [620, 160, 980, 160, 1000, 860, 600, 860], 70)] },
  { id: "towel-spa", name: "Стопка полотенец", products: ["towel"], isDefault: false, tile: 80, shapes: `<polygon points="420,360 1100,340 1120,760 400,780" fill="url(#fab)"/>`, areas: [area("stack", "Стопка", [420, 360, 1100, 340, 1120, 760, 400, 780], 90)] },
  { id: "tea-towel", name: "Кухонное полотенце", products: ["tea-towel"], isDefault: true, tile: 80, shapes: `<polygon points="640,180 980,180 990,780 630,780" fill="url(#fab)"/>`, areas: [area("towel", "Полотенце", [640, 180, 980, 180, 990, 780, 630, 780], 50)] },
  { id: "table-rect", name: "Стол со скатертью", products: ["tablecloth"], isDefault: true, tile: 140, shapes: `<polygon points="260,380 1240,350 1320,860 180,890" fill="url(#fab)"/>`, areas: [area("cloth", "Скатерть", [260, 380, 1240, 350, 1320, 860, 180, 890], 180)] },
  { id: "table-round", name: "Круглый стол", products: ["tablecloth"], isDefault: false, tile: 120, shapes: `<ellipse cx="750" cy="620" rx="460" ry="220" fill="url(#fab)"/>`, areas: [area("cloth", "Скатерть", [290, 400, 1210, 400, 1210, 840, 290, 840], 160)] },
  { id: "throw-bench", name: "Покрывало на скамье", products: ["blanket"], isDefault: true, tile: 140, shapes: `<polygon points="300,420 1220,380 1260,820 260,860" fill="url(#fab)"/>`, areas: [area("throw", "Покрывало", [300, 420, 1220, 380, 1260, 820, 260, 860], 180)] },
  { id: "fabric-roll", name: "Рулон ткани", products: ["roll"], isDefault: true, tile: 110, shapes: `<polygon points="360,280 1180,240 1220,760 320,800" fill="url(#fab)"/>`, areas: [area("roll", "Рулон", [360, 280, 1180, 240, 1220, 760, 320, 800], 150)] },
  { id: "napkins", name: "Салфетки", products: ["napkins"], isDefault: true, tile: 90, shapes: `<polygon points="560,340 980,340 1000,760 540,760" fill="url(#fab)"/>`, areas: [area("napkin", "Салфетка", [560, 340, 980, 340, 1000, 760, 540, 760], 40)] },
  { id: "robe", name: "Халат", products: ["robe"], isDefault: true, tile: 120, shapes: `<polygon points="560,140 980,140 1060,880 480,880" fill="url(#fab)"/>`, areas: [area("robe", "Халат", [560, 140, 980, 140, 1060, 880, 480, 880], 70)] },
];

function room(fill: string, shapes: string, dark = false) {
  const wall = dark ? "#2c2824" : "#efe6d6";
  const floor = dark ? "#1b1714" : "#d9c7ae";
  return `<rect width="1500" height="1000" fill="${wall}"/><rect y="560" width="1500" height="440" fill="${floor}"/>${shapes.replaceAll("url(#fab)", fill)}<path d="M480 520 C 700 560, 900 500, 1180 560" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="16"/>`;
}

async function writeSet(rel: string, input: Buffer) {
  const full = await sharp(input).resize(2000, 2000, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
  const mid = await sharp(input).resize(1200, 1200, { fit: "inside" }).webp({ quality: 78 }).toBuffer();
  const small = await sharp(input).resize(600, 600, { fit: "inside" }).webp({ quality: 74 }).toBuffer();
  await writeFile(path.join(publicDir, `${rel}.webp`), full);
  await writeFile(path.join(publicDir, `${rel}-1200.webp`), mid);
  await writeFile(path.join(publicDir, `${rel}-600.webp`), small);
  return `/${rel}.webp`;
}

async function main() {
  await mkdir(path.join(publicDir, "media/designs"), { recursive: true });
  await mkdir(path.join(publicDir, "media/mockups"), { recursive: true });
  await mkdir(path.join(publicDir, "media/templates"), { recursive: true });
  await mkdir(path.join(publicDir, "samples"), { recursive: true });
  await mkdir(path.join(root, "data"), { recursive: true });

  const patternPng = new Map<string, Buffer>();
  for (const [id, pattern] of Object.entries(patterns)) {
    const png = await sharp(Buffer.from(pattern.svg)).resize(1600, 1600).png().toBuffer();
    patternPng.set(id, png);
    await writeFile(path.join(publicDir, `media/designs/${id}.png`), png);
    await writeSet(`media/designs/${id}`, png);
    const thumb = await sharp(png).resize(400, 400).webp({ quality: 76 }).toBuffer();
    await writeFile(path.join(publicDir, `media/designs/${id}-thumb.webp`), thumb);
  }

  const templateRecords: Template[] = [];
  for (const [index, scene] of scenes.entries()) {
    const base64 = patternPng.get("khiva")!.toString("base64");
    const withPattern = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><defs><pattern id="fab" patternUnits="userSpaceOnUse" width="${scene.tile}" height="${scene.tile}"><image href="data:image/png;base64,${base64}" width="${scene.tile}" height="${scene.tile}"/></pattern></defs>${room("url(#fab)", scene.shapes, scene.id.includes("dark") || scene.id === "night")}</svg>`;
    const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000">${room("#d9d3c8", scene.shapes, scene.id.includes("dark"))}</svg>`;
    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><path d="M500 500 C 760 560, 980 470, 1200 540" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="18"/></svg>`;
    const thumb = await sharp(Buffer.from(withPattern)).webp({ quality: 76 }).toBuffer();
    const bgUrl = await writeSet(`media/templates/${scene.id}-bg`, await sharp(Buffer.from(bg)).png().toBuffer());
    const ovUrl = await writeSet(`media/templates/${scene.id}-ov`, await sharp(Buffer.from(overlay)).png().toBuffer());
    await writeFile(path.join(publicDir, `media/templates/${scene.id}-thumb.webp`), await sharp(thumb).resize(600, 400, { fit: "cover" }).webp().toBuffer());
    const json = { areas: scene.areas, engine: "webgl" };
    await writeFile(path.join(publicDir, `media/templates/${scene.id}.json`), JSON.stringify(json, null, 2));
    templateRecords.push({
      id: scene.id,
      kind: "demo",
      productTypes: scene.products,
      name: scene.name,
      source: { psdUrl: "", fileName: "starter.svg", sizeMb: 0.4, widthPx: 1500, heightPx: 1000 },
      engine: "webgl",
      compatibility: { ok: true, warnings: ["Демо-шаблон для разработки. Основной формат — импорт ZIP (SPEC 5.7)."] },
      baked: { backgroundUrl: bgUrl, overlays: [{ url: ovUrl, blendMode: "multiply", opacity: 0.45, x: 0, y: 0 }], jsonUrl: `/media/templates/${scene.id}.json` },
      areas: scene.areas,
      thumbnailUrl: `/media/templates/${scene.id}-thumb.webp`,
      isDefault: scene.isDefault,
      order: index + 1,
    });
  }

  const fabricRows: Array<Omit<Fabric, "mockups" | "design" | "densityRange" | "widthList"> & { pattern: string }> = [
    row("kr-1042", "KR-1042", "internal", "kurpacha-fabric", loc("Атлас «Хива»", "Atlas «Khiva»", "Atlas «Xiva»"), "140", "150", 32, ["kurpacha", "pillow"], ["цветы", "орнамент", "синий", "золото"], true, "khiva"),
    row("kr-1108", "KR-1108", "internal", "kurpacha-fabric", loc("Сузани «Бухара»", "Suzani «Bukhara»", "Syuzane «Buxoro»"), "160", "150 / 220", 36, ["kurpacha", "pillow"], ["орнамент", "бордовый"], false, "bukhara"),
    row("st-2201", "ST-2201", "euro", "sateen", loc("Лаванда", "Lavanda", "Lavanda"), "120–125", "220", 24, ["kpb", "duvet", "sheet", "pillowcase"], ["цветы", "сиреневый"], true, "lavanda"),
    row("st-2214", "ST-2214", "euro", "stripe-sateen", loc("Геометрия «Самарканд»", "Geometry «Samarkand»", "Geometriya «Samarqand»"), "130", "220 / 240", 16, ["kpb", "duvet", "sheet", "pillowcase"], ["геометрия", "синий"], false, "samarkand"),
    row("st-2302", "ST-2302", "euro", "stripe-sateen", loc("Полоса «Нил»", "Nile stripe", "Nil yo'li"), "125±5", "240", 18, ["kpb", "duvet", "sheet"], ["геометрия", "зелёный"], true, "nile"),
    row("pl-301", "PL-301", "internal", "poplin", loc("Поплин «Утро»", "Poplin «Utro»", "Poplin «Tong»"), "118", "220", 12, ["kpb", "sheet", "pillowcase"], ["цветы", "зелёный"], false, "morning"),
    row("tf-410", "TF-410", "internal", "waffle", loc("Вафля «Мята»", "Waffle «Myata»", "Vafel «Yalpiz»"), "180", "80 / 150", 4, ["towel", "tea-towel"], ["мята"], false, "mint"),
    row("mh-512", "MH-512", "internal", "terry", loc("Махра «Песок»", "Terry «Sand»", "Mahra «Qum»"), "420", "150", 2, ["towel"], ["песок", "беж"], false, "sand"),
    row("fs-801", "FS-801", "fashion", "twill", loc("Икат «Маргилан»", "Ikat «Margilan»", "Ikat «Marg'ilon»"), "145", "150", 28, ["robe", "roll", "pillow"], ["икат", "красный"], true, "ikat"),
    row("fs-814", "FS-814", "fashion", "twill", loc("Ночь", "Night", "Tun"), "150", "150", 32, ["robe", "roll"], ["чёрный", "золото"], false, "night"),
    row("bl-090", "BL-090", "internal", "calico", loc("Бязь «Детская»", "Calico «Kids»", "Byaz «Bolalar»"), "120", "150 / 220", 20, ["kpb", "sheet"], ["детское", "жёлтый"], false, "kids"),
    row("dk-077", "DK-077", "internal", "duck", loc("Дак «Поле»", "Duck «Field»", "Dak «Maydon»"), "210", "160", 24, ["tablecloth", "napkins"], ["геометрия"], false, "duck"),
  ];

  const fabrics: Fabric[] = [];
  for (const item of fabricRows) {
    const design = { originalUrl: `/media/designs/${item.pattern}.png`, webUrl: `/media/designs/${item.pattern}.webp`, thumbUrl: `/media/designs/${item.pattern}-thumb.webp`, widthPx: 1600, heightPx: 1600, seamless: true };
    const mockups: Mockup[] = [];
    for (const productType of item.productTypes) {
      const template = templateRecords.find((record) => record.productTypes.includes(productType) && record.isDefault) ?? templateRecords.find((record) => record.productTypes.includes(productType));
      if (!template) continue;
      const png = patternPng.get(item.pattern)!;
      const scene = scenes.find((entry) => entry.id === template.id)!;
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><defs><pattern id="fab" patternUnits="userSpaceOnUse" width="${scene.tile}" height="${scene.tile}"><image href="data:image/png;base64,${png.toString("base64")}" width="${scene.tile}" height="${scene.tile}"/></pattern></defs>${room("url(#fab)", scene.shapes, scene.id.includes("dark"))}</svg>`;
      const rendered = await sharp(Buffer.from(markup)).png().toBuffer();
      const rel = `media/mockups/${item.id}-${template.id}`;
      const url = await writeSet(rel, rendered);
      mockups.push({ productType, templateId: template.id, url, thumbUrl: `${url.replace(/\.webp$/, "")}-600.webp`, webUrl: `${url.replace(/\.webp$/, "")}-1200.webp`, sameForAllAreas: true, areas: template.areas.map((zone) => ({ areaId: zone.id, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })), engine: "webgl", generatedAt: now });
    }
    const { pattern: _pattern, ...rest } = item;
    fabrics.push({ ...rest, design, mockups, densityRange: parseDensity(item.density), widthList: parseWidths(item.width), realPhotos: item.id === "kr-1042" ? [{ url: design.webUrl, thumbUrl: design.thumbUrl }] : [] });
  }

  fabrics.push({
    ...row("fl-012", "FL-012", "internal", "flannel", loc("Фланель «Облако»", "", ""), "170", "220", 0, ["kpb"], ["серый"], false, "cloud"),
    design: { originalUrl: "/media/designs/cloud.png", webUrl: "/media/designs/cloud.webp", thumbUrl: "/media/designs/cloud-thumb.webp", widthPx: 1600, heightPx: 1600, seamless: true },
    mockups: [],
    densityRange: parseDensity("170"),
    widthList: [220],
    status: "draft",
    realPhotos: [],
  });

  const productTypes = dictionaryProducts();
  const fabricTypes = dictionaryFabrics();
  const collections = dictionaryCollections();
  const catalogs = dictionaryCatalogs(fabrics);
  const db: Database = {
    collections,
    fabricTypes,
    productTypes,
    templates: templateRecords,
    fabrics,
    catalogs,
    leads: [
      { id: "lead-1", catalogSlug: "kurpacha-2026", fabricId: "kr-1042", fabricIds: ["kr-1042"], name: "Малика", contact: "@malika", message: "Нужен образец курпачи", lang: "ru", createdAt: "2026-10-12T08:00:00.000Z", status: "new" },
      { id: "lead-2", catalogSlug: "euro-sateen", fabricId: "st-2201", fabricIds: ["st-2201", "st-2214"], name: "Anna", contact: "+48 000 000 000", lang: "en", createdAt: "2026-10-18T11:00:00.000Z", status: "in_work" },
    ],
    events: sampleEvents(),
    users: [
      { id: "user-admin", email: "admin@bahmal.uz", name: "Администратор", role: "admin", passwordHash: "" },
      { id: "user-designer", email: "designer@bahmal.uz", name: "Дизайнер", role: "designer", passwordHash: "" },
      { id: "user-manager", email: "manager@bahmal.uz", name: "Менеджер", role: "manager", passwordHash: "" },
    ],
    glossary: glossary(),
  };
  await writeFile(path.join(root, "data/seed.json"), JSON.stringify(db, null, 2));
  await writeSamplePsd();
  console.log(`seed fabrics ${fabrics.length}, templates ${templateRecords.length}`);
}

function row(id: string, art: string, collectionId: string, fabricTypeId: string, name: Fabric["name"], density: string, width: string, rapport: number, productTypes: string[], tags: string[], isNew: boolean, pattern: string) {
  return {
    id,
    art,
    collectionId,
    fabricTypeId,
    name,
    description: loc(
      `${name.ru}: набивной рисунок для каталога BAHMAL HOME.`,
      `${name.en || name.ru}: a printed design for the BAHMAL HOME catalogue.`,
      `${name.uz || name.ru}: BAHMAL HOME katalogi uchun bosma rasm.`,
    ),
    composition: loc("100% хлопок", "100% cotton", "100% paxta"),
    density,
    width,
    rapport: { widthCm: rapport, heightCm: rapport || 0 },
    colors: patterns[pattern]?.colors ?? [],
    tags,
    productTypes,
    status: "published" as const,
    isNew,
    priceVisible: id.startsWith("st-") ? { usd: 4.8, uzs: 62000 } : undefined,
    translationLocked: {},
    createdBy: "user-designer",
    createdAt: now,
    updatedAt: now,
    pattern,
  };
}

function dictionaryCollections(): Collection[] {
  return [
    { id: "internal", name: loc("Внутренний рынок", "Domestic market", "Ichki bozor"), slug: "internal", order: 1, active: true, catalogSlug: "kurpacha-2026" },
    { id: "euro", name: loc("Евро коллекция", "Euro collection", "Yevro kolleksiya"), slug: "euro", order: 2, active: true, catalogSlug: "euro-sateen" },
    { id: "fashion", name: loc("Fashion", "Fashion", "Fashion"), slug: "fashion", order: 3, active: true, catalogSlug: "fashion-poland" },
  ];
}

function dictionaryFabrics(): FabricType[] {
  const items: Array<[string, string, string, string, string[]]> = [
    ["poplin", "Поплин", "Poplin", "Poplin", ["kpb", "duvet", "sheet", "pillowcase"]],
    ["sateen", "Сатин", "Sateen", "Satin", ["kpb", "duvet", "sheet", "pillowcase"]],
    ["stripe-sateen", "Страйп-сатин", "Stripe sateen", "Stripe satin", ["kpb", "duvet", "sheet", "pillowcase"]],
    ["flannel", "Фланель", "Flannel", "Flanel", ["kpb", "robe"]],
    ["calico", "Бязь", "Calico", "Byaz", ["kpb", "sheet"]],
    ["waffle", "Вафельное полотно", "Waffle fabric", "Vafel mato", ["towel", "tea-towel"]],
    ["terry", "Махра", "Terry", "Mahra", ["towel"]],
    ["duck", "Дак", "Duck canvas", "Dak", ["tablecloth", "napkins"]],
    ["kurpacha-fabric", "Ткань для курпачи", "Kurpacha fabric", "Ko'rpacha matosi", ["kurpacha", "pillow"]],
    ["twill", "Твил", "Twill", "Tvil", ["robe", "roll"]],
    ["jacquard", "Жаккард", "Jacquard", "Jakkard", ["kpb", "duvet", "sheet", "pillowcase"]],
    ["damask", "Дамаск", "Damask", "Damask", ["kpb", "duvet", "sheet", "tablecloth"]],
  ];
  const woven = new Set(["stripe-sateen", "jacquard", "damask"]);
  return items.map(([id, ru, en, uz, suggested], order) => ({
    id,
    name: loc(ru, en, uz),
    suggestedProductTypes: suggested,
    order: order + 1,
    active: true,
    ...(woven.has(id) ? { woven: true } : {}),
  }));
}

function dictionaryProducts(): ProductType[] {
  const items: Array<[string, string, string, string, string[]]> = [
    ["kpb", "КПБ", "Bed linen set", "To'shak jihozi", ["poplin", "sateen", "stripe-sateen", "calico", "flannel"]],
    ["duvet", "Пододеяльник", "Duvet cover", "Ko'rpa jildi", ["sateen", "stripe-sateen", "poplin"]],
    ["sheet", "Простыня", "Flat sheet", "Choyshab", ["poplin", "sateen", "calico"]],
    ["pillowcase", "Наволочка", "Pillowcase", "Yostiq jildi", ["poplin", "sateen", "stripe-sateen"]],
    ["blanket", "Одеяло/покрывало", "Blanket", "Adyol", ["sateen"]],
    ["mattress-cover", "Наматрасник", "Mattress cover", "Matras qoplamasi", ["calico"]],
    ["kurpacha", "Курпача", "Kurpacha", "Ko'rpacha", ["kurpacha-fabric"]],
    ["pillow", "Декоративная подушка", "Cushion", "Yostiq", ["kurpacha-fabric", "twill", "sateen"]],
    ["towel", "Полотенце", "Towel", "Sochiq", ["waffle", "terry"]],
    ["tea-towel", "Кухонное полотенце", "Tea towel", "Oshxona sochig'i", ["waffle"]],
    ["tablecloth", "Скатерть", "Tablecloth", "Dasturxon", ["duck"]],
    ["napkins", "Салфетки", "Napkins", "Salfetkalar", ["duck"]],
    ["mitt", "Прихватка/рукавица", "Oven mitt", "Tutqich", ["waffle"]],
    ["robe", "Пижама/халат", "Robe", "Xalat", ["twill", "flannel"]],
    ["roll", "Рулон ткани", "Fabric roll", "Mato ruloni", ["twill", "sateen", "poplin"]],
  ];
  return items.map(([id, ru, en, uz, suggestedFor], order) => ({ id, name: loc(ru, en, uz), suggestedFor, order: order + 1, active: true }));
}

function contacts() {
  return { phone: "+998 00 000 00 00", telegram: "bahmal_home", email: "catalog@bahmal.uz", address: "Хорезм, Узбекистан" };
}

function dictionaryCatalogs(fabrics: Fabric[]): Catalog[] {
  const base = { subtitle: loc("", "", ""), langs: ["ru", "en", "uz"] as Catalog["langs"], cover: {}, showPrices: false, contacts: contacts(), createdBy: "user-manager", updatedAt: now, status: "live" as const };
  return [
    { ...base, slug: "kurpacha-2026", title: loc("Курпача 2026", "Kurpacha 2026", "Ko'rpacha 2026"), subtitle: loc("Набивные курпачи сезона", "Printed kurpacha for the season", "Mavsum bosma ko'rpachalari"), defaultLang: "ru", mode: "rules", rules: { productTypes: ["kurpacha"] }, showProductTypes: ["kurpacha", "pillow"], layout: { perPage: 2, sectionBy: "fabricType", theme: "light" }, cover: { fabricId: "kr-1042" }, access: "public" },
    { ...base, slug: "euro-sateen", title: loc("Евро — сатин", "Euro sateen", "Yevro satin"), defaultLang: "ru", mode: "rules", rules: { fabricTypes: ["sateen", "stripe-sateen"] }, showProductTypes: ["kpb", "duvet", "sheet", "pillowcase"], layout: { perPage: 2, sectionBy: "fabricType", theme: "light" }, cover: { fabricId: "st-2201" }, access: "public" },
    { ...base, slug: "fashion-poland", title: loc("Fashion для Польши", "Fashion for Poland", "Polsha uchun Fashion"), defaultLang: "en", langs: ["en", "ru"], mode: "rules", rules: { collections: ["fashion"] }, showProductTypes: ["robe", "roll", "pillow"], layout: { perPage: 1, sectionBy: "none", theme: "dark" }, cover: { fabricId: "fs-801" }, access: "public" },
    { ...base, slug: "towels-kitchen", title: loc("Полотенца и кухня", "Towels and kitchen", "Sochiq va oshxona"), defaultLang: "ru", mode: "rules", rules: { productTypes: ["towel", "tea-towel"] }, showProductTypes: ["towel", "tea-towel"], layout: { perPage: 2, sectionBy: "fabricType", theme: "light" }, cover: { fabricId: "tf-410" }, access: "public" },
    { ...base, slug: "novinki-osen", title: loc("Новинки осени", "New this autumn", "Kuz yangiliklari"), defaultLang: "ru", mode: "rules", rules: { onlyNew: true }, showProductTypes: ["kurpacha", "kpb", "pillow", "robe"], layout: { perPage: 2, sectionBy: "collection", theme: "light" }, cover: { fabricId: "st-2201" }, access: "public" },
    { ...base, slug: "b2b-prices", title: loc("B2B прайс", "B2B prices", "B2B narx"), defaultLang: "ru", mode: "manual", fabricIds: fabrics.filter((fabric) => fabric.priceVisible).map((fabric) => fabric.id), showProductTypes: ["kpb", "duvet", "sheet", "pillowcase"], layout: { perPage: 2, sectionBy: "none", theme: "light" }, showPrices: true, access: "pin", pinHash: hashPin("2580") },
  ];
}

function sampleEvents(): Database["events"] {
  const rows: Database["events"] = [];
  for (const [index, slug] of ["kurpacha-2026", "euro-sateen", "fashion-poland"].entries()) {
    for (let n = 0; n < 4; n += 1) {
      rows.push({ id: `ev-${slug}-${n}`, catalogSlug: slug, type: "open", ts: now, sessionId: `s-${index}-${n}` });
      rows.push({ id: `pg-${slug}-${n}`, catalogSlug: slug, type: "page", page: n + 1, ts: now, sessionId: `s-${index}-${n}` });
    }
    rows.push({ id: `fab-${slug}`, catalogSlug: slug, type: "fabric_open", fabricId: slug === "euro-sateen" ? "st-2201" : "kr-1042", ts: now, sessionId: `s-${index}-0` });
  }
  rows.push({ id: "zoom-1", catalogSlug: "kurpacha-2026", type: "zoom", fabricId: "kr-1042", ts: now, sessionId: "s-0-0" });
  return rows;
}

function glossary(): GlossaryTerm[] {
  const terms: Array<[string, string, string]> = [
    ["поплин", "poplin", "poplin"],
    ["сатин", "sateen", "satin"],
    ["страйп-сатин", "stripe sateen", "stripe satin"],
    ["фланель", "flannel", "flanel"],
    ["бязь", "calico", "byaz"],
    ["вафельное полотно", "waffle fabric", "vafel mato"],
    ["махра", "terry", "mahra"],
    ["дак", "duck canvas", "dak"],
    ["ткань для курпачи", "kurpacha fabric", "ko'rpacha matosi"],
    ["курпача", "kurpacha", "ko'rpacha"],
    ["КПБ", "bed linen set", "to'shak jihozi"],
    ["пододеяльник", "duvet cover", "ko'rpa jildi"],
    ["простыня", "flat sheet", "choyshab"],
    ["простыня на резинке", "fitted sheet", "rezinkali choyshab"],
    ["наволочка", "pillowcase", "yostiq jildi"],
    ["плотность", "density (g/m²)", "zichlik (g/m²)"],
    ["ширина", "width (cm)", "eni (sm)"],
    ["раппорт", "repeat", "rapport"],
    ["набивной", "printed", "bosma"],
    ["гладкокрашеный", "solid-dyed", "silliq bo'yalgan"],
    ["абр/икат", "ikat (abr)", "abr/ikat"],
    ["сюзане", "suzani", "syuzane"],
    ["не линяет", "colourfast", "rangi chiqmaydi"],
  ];
  return terms.map(([ru, en, uz], index) => ({ id: `g-${index + 1}`, ru, en, uz }));
}

async function writeSamplePsd() {
  const solid = (w: number, h: number, r: number, g: number, b: number, a = 255) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
    return { width: w, height: h, data };
  };
  try {
    const buffer = writePsdBuffer({
      width: 800,
      height: 600,
      children: [
        { name: "Background", imageData: solid(800, 600, 239, 230, 214), left: 0, top: 0 },
        { name: "Your design here", imageData: solid(400, 280, 210, 210, 210), left: 200, top: 160, placedLayer: { id: "20953ddb-9391-11ec-b4f1-c15674f50bc4", type: "raster", transform: [200, 160, 600, 150, 620, 460, 180, 470], width: 400, height: 280 } },
        { name: "Shadow", blendMode: "multiply", opacity: 160, imageData: solid(800, 600, 40, 30, 20, 70), left: 0, top: 0 },
      ],
    });
    await writeFile(path.join(publicDir, "samples/demo-mockup.psd"), Buffer.from(buffer));
  } catch (error) {
    console.warn("sample psd skipped", error);
  }
}

void main();
