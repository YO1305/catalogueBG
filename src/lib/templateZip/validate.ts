import type { ZipTemplateManifest, ZipTemplateZone, ZipUvGrid } from "@/lib/templateZip/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readUvGrid(raw: unknown): ZipUvGrid | null {
  if (!isRecord(raw)) return null;
  const { x0, y0, step, cols, rows, u, v } = raw;
  if (typeof x0 !== "number" || typeof y0 !== "number" || typeof step !== "number") return null;
  if (typeof cols !== "number" || typeof rows !== "number") return null;
  if (!Array.isArray(u) || !Array.isArray(v)) return null;
  if (u.length !== cols * rows || v.length !== cols * rows) return null;
  if (!u.every((n) => typeof n === "number") || !v.every((n) => typeof n === "number")) return null;
  return { x0, y0, step, cols, rows, u, v };
}

function readZone(raw: unknown, finish: string | undefined, errors: string[]): ZipTemplateZone | null {
  if (!isRecord(raw)) {
    errors.push("Некорректная зона в template.json");
    return null;
  }
  const id = typeof raw.id === "string" ? raw.id : "";
  const label = typeof raw.label === "string" ? raw.label : id;
  const mask = typeof raw.mask === "string" ? raw.mask : "";
  const shade = typeof raw.shade === "string" ? raw.shade : "";
  const pxPerCm = typeof raw.pxPerCm === "number" ? raw.pxPerCm : NaN;
  const uvGrid = readUvGrid(raw.uvGrid);
  if (!id) errors.push("У зоны нет id");
  if (!mask) errors.push(`Зона «${label}»: не указан mask`);
  if (!shade) errors.push(`Зона «${label}»: не указан shade`);
  if (!Number.isFinite(pxPerCm) || pxPerCm <= 0) errors.push(`Зона «${label}»: некорректный pxPerCm`);
  if (!uvGrid) errors.push(`Зона «${label}»: некорректная uvGrid (u/v должны быть cols×rows)`);
  const weave = typeof raw.weave === "string" ? raw.weave : undefined;
  const gloss = typeof raw.gloss === "string" ? raw.gloss : undefined;
  if (finish === "sateen") {
    if (!weave) errors.push(`Зона «${label}»: для sateen нужен weave`);
    if (!gloss) errors.push(`Зона «${label}»: для sateen нужен gloss`);
  }
  if (!id || !mask || !shade || !uvGrid || !Number.isFinite(pxPerCm)) return null;
  return { id, label, mask, shade, weave, gloss, pxPerCm, uvGrid };
}

export function validateZipTemplateJson(json: unknown): { ok: true; manifest: ZipTemplateManifest } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(json)) return { ok: false, errors: ["template.json должен быть объектом"] };
  const name = typeof json.name === "string" ? json.name.trim() : "";
  if (!name) errors.push("В template.json нет name");
  const sizeRaw = json.size;
  if (!Array.isArray(sizeRaw) || sizeRaw.length !== 2 || typeof sizeRaw[0] !== "number" || typeof sizeRaw[1] !== "number") {
    errors.push("Поле size должно быть [ширина, высота] в пикселях");
  }
  const finish = typeof json.finish === "string" ? json.finish : undefined;
  const zonesRaw = json.zones;
  if (!Array.isArray(zonesRaw) || !zonesRaw.length) errors.push("Нужен хотя бы один элемент в zones");
  const zones: ZipTemplateZone[] = [];
  if (Array.isArray(zonesRaw)) {
    for (const entry of zonesRaw) {
      const zone = readZone(entry, finish, errors);
      if (zone) zones.push(zone);
    }
  }
  if (!zones.length) errors.push("Не удалось прочитать ни одной зоны");
  if (errors.length) return { ok: false, errors };
  const [widthPx, heightPx] = sizeRaw as [number, number];
  const manifest: ZipTemplateManifest = {
    name,
    finish,
    size: [widthPx, heightPx],
    units: typeof json.units === "string" ? json.units : undefined,
    tint_bgr: Array.isArray(json.tint_bgr) && json.tint_bgr.length === 3 ? (json.tint_bgr as [number, number, number]) : undefined,
    stripe: isRecord(json.stripe) ? { axis: String(json.stripe.axis), photoPeriodCm: Number(json.stripe.photoPeriodCm) } : undefined,
    zones,
  };
  return { ok: true, manifest };
}

/** Match `mask_duvet.png` to `template/mask_duvet.png` when JSON uses basename only. */
export function resolveZipAssetPath(fileNames: Set<string>, requested: string): string | null {
  const norm = requested.replace(/\\/g, "/").replace(/^\.?\//, "");
  if (fileNames.has(norm)) return norm;
  const base = norm.split("/").pop() ?? norm;
  const matches = [...fileNames].filter((p) => p.endsWith(`/${base}`) || p === base);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const preferred = matches.find((p) => p.includes("/template/")) ?? matches[0];
    return preferred;
  }
  return null;
}

export function validateZipAssets(manifest: ZipTemplateManifest, fileNames: Set<string>): string[] {
  const errors: string[] = [];
  const bg = resolveZipAssetPath(fileNames, "background.jpg");
  if (!bg) errors.push("В ZIP нет background.jpg");
  for (const zone of manifest.zones) {
    for (const key of ["mask", "shade", "weave", "gloss"] as const) {
      const file = zone[key];
      if (!file) continue;
      if (!resolveZipAssetPath(fileNames, file)) errors.push(`Зона «${zone.label}»: файл ${file} не найден в ZIP`);
    }
  }
  return errors;
}
