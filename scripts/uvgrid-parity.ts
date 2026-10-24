/**
 * Compare TS uvgrid render with reference JPGs from template ZIP (out/).
 * Usage: npx tsx scripts/uvgrid-parity.ts path/to/package.zip [more.zip...]
 */
import { existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import JSZip from "jszip";
import { floatRgbToRgba, renderUvgrid } from "../src/lib/uvgrid/render.ts";
import { loadZoneAssetsNode, readPatternRgba } from "../src/lib/uvgrid/nodeAssets.ts";
import type { ZipTemplateManifest } from "../src/lib/templateZip/types.ts";

type TestCase = {
  design: string;
  scale: number;
  du: number;
  dv: number;
  rot: number;
  out: string;
  rapportCm: number;
};

function inferTestsFromOut(root: string): TestCase[] {
  const outDir = path.join(root, "out");
  if (!existsSync(outDir)) return [];
  const mapDesign = (token: string) => {
    if (token.startsWith("floral")) return "designs/floral_lavanda.png";
    if (token.startsWith("ikat")) return "designs/ikat_khiva.png";
    if (token.startsWith("stripe")) return "designs/stripe_grafit.png";
    return `designs/${token}.png`;
  };
  return readdirSync(outDir)
    .filter((name) => name.endsWith(".jpg"))
    .map((name) => {
      const stem = name.replace(/\.jpg$/i, "").replace(/^kpb_/, "");
      let scale = 1;
      let rot = 0;
      let token = stem;
      const scaleMatch = stem.match(/x([0-9.]+)/i);
      if (scaleMatch) {
        scale = Number(scaleMatch[1]);
        token = stem.replace(/_x[0-9.]+/i, "").replace(/_rot[0-9]+/i, "");
      }
      const rotMatch = stem.match(/rot([0-9]+)/i);
      if (rotMatch) rot = Number(rotMatch[1]);
      token = token.replace(/_rot[0-9]+/i, "");
      return {
        design: mapDesign(token),
        scale,
        du: 0,
        dv: 0,
        rot,
        out: `out/${name}`,
        rapportCm: 8,
      };
    });
}

function parseRunTests(python: string): TestCase[] {
  const tests: TestCase[] = [];
  const blockRe = /\{\s*["']design["']\s*:\s*["']([^"']+)["'][^}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(python))) {
    const chunk = match[0];
    const design = match[1];
    const num = (key: string, fallback: number) => {
      const m = chunk.match(new RegExp(`["']${key}["']\\s*:\\s*([-+0-9.]+)`));
      return m ? Number(m[1]) : fallback;
    };
    const outM = chunk.match(/["']out["']\s*:\s*["']([^"']+)["']/);
    tests.push({
      design,
      scale: num("scale", 1),
      du: num("du", num("offset_u", 0)),
      dv: num("dv", num("offset_v", 0)),
      rot: num("rot", num("rotation", 0)),
      out: outM?.[1] ?? "",
      rapportCm: num("rapport_cm", num("rapport", 8)),
    });
  }
  if (tests.length) return tests;
  const simple = [...python.matchAll(/designs\/[^\s"']+\.(?:png|jpg|jpeg)/gi)].map((m) => ({
    design: m[0],
    scale: 1,
    du: 0,
    dv: 0,
    rot: 0,
    out: "",
    rapportCm: 8,
  }));
  return simple;
}

async function extractZip(zipPath: string, dir: string) {
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  await mkdir(dir, { recursive: true });
  const zip = await JSZip.loadAsync(await readFile(zipPath));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const target = path.join(dir, name.replace(/\\/g, "/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await entry.async("arraybuffer")));
  }
}

function findFile(root: string, relative: string): string {
  const norm = relative.replace(/\\/g, "/");
  const direct = path.join(root, norm);
  if (existsSync(direct)) return direct;
  const base = relative.split("/").pop() ?? relative;
  const walk = (folder: string): string | null => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (entry.name === base || entry.name === relative.replace(/^.*\//, "")) return full;
    }
    return null;
  };
  const found = walk(root);
  if (!found) throw new Error(`missing ${relative}`);
  return found;
}

async function renderCase(root: string, manifest: ZipTemplateManifest, test: TestCase) {
  const [w, h] = manifest.size;
  const backgroundBuf = await readFile(findFile(root, "background.jpg"));
  const bg = await sharp(backgroundBuf).resize(w, h, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const zones = await loadZoneAssetsNode(manifest, w, h);
  const designPath = findFile(root, test.design);
  const pattern = await readPatternRgba(designPath);
  pattern.rapportWidthCm = 8;
  pattern.rapportHeightCm = 8;
  const settings = manifest.zones.map((zone) => ({
    areaId: zone.id,
    scale: test.scale,
    offsetX: test.du,
    offsetY: test.dv,
    rotation: test.rot,
  }));
  const flat = renderUvgrid({
    manifest,
    width: w,
    height: h,
    background: new Uint8ClampedArray(bg.buffer, bg.byteOffset, w * h * 4),
    zones,
    fabric: pattern,
    settings,
    sameForAllAreas: true,
    rapportCm: test.rapportCm,
  });
  const rgba = floatRgbToRgba(flat, w, h);
  return sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).jpeg({ quality: 92 }).toBuffer();
}

async function processZip(zipPath: string, outDir: string) {
  const tmp = path.join(os.tmpdir(), `uvgrid-parity-${Date.now()}`);
  await extractZip(zipPath, tmp);
  const jsonPath =
    ["template/template.json", "template.json"].map((p) => path.join(tmp, p)).find((p) => existsSync(p)) ??
    findFile(tmp, "template.json");
  const raw = JSON.parse(await readFile(jsonPath, "utf8")) as ZipTemplateManifest;
  const manifest: ZipTemplateManifest = {
    ...raw,
    zones: raw.zones.map((zone) => ({
      ...zone,
      mask: findFile(tmp, zone.mask.includes("/") ? zone.mask : `template/${zone.mask}`),
      shade: findFile(tmp, zone.shade.includes("/") ? zone.shade : `template/${zone.shade}`),
      weave: zone.weave ? findFile(tmp, zone.weave.includes("/") ? zone.weave : `template/${zone.weave}`) : undefined,
      gloss: zone.gloss ? findFile(tmp, zone.gloss.includes("/") ? zone.gloss : `template/${zone.gloss}`) : undefined,
    })),
  };
  const runTestsPath = ["run_tests.py", "template/run_tests.py"].map((p) => path.join(tmp, p)).find((p) => existsSync(p));
  let tests = runTestsPath ? parseRunTests(await readFile(runTestsPath, "utf8")) : [];
  if (!tests.length) tests = inferTestsFromOut(tmp);
  const rows: string[] = [];
  for (const test of tests) {
    try {
      const rendered = await renderCase(tmp, manifest, test);
      const base = path.basename(test.design, path.extname(test.design));
      const refName = test.out ? path.basename(test.out) : `${base}.jpg`;
      let ref: Buffer | null = null;
      try {
        ref = await readFile(findFile(tmp, test.out || `out/${refName}`));
      } catch {
        ref = null;
      }
      const tsPath = path.join(outDir, `${path.basename(zipPath, ".zip")}-${base}-ts.jpg`);
      await writeFile(tsPath, rendered);
      if (ref) {
        const refPath = path.join(outDir, `${path.basename(zipPath, ".zip")}-${base}-ref.jpg`);
        await writeFile(refPath, ref);
        const meta = await sharp(ref).metadata();
        const rw = meta.width ?? manifest.size[0];
        const rh = meta.height ?? manifest.size[1];
        const left = await sharp(rendered).resize(rw, rh, { fit: "fill" }).toBuffer();
        const compare = await sharp({
          create: { width: rw * 2, height: rh, channels: 3, background: "#ffffff" },
        })
          .composite([
            { input: left, left: 0, top: 0 },
            { input: ref, left: rw, top: 0 },
          ])
          .jpeg({ quality: 90 })
          .toBuffer();
        const cmpPath = path.join(outDir, `${path.basename(zipPath, ".zip")}-${base}-compare.jpg`);
        await writeFile(cmpPath, compare);
        rows.push(`<tr><td>${base}</td><td><img src="${path.basename(cmpPath)}" width="480"/></td></tr>`);
      } else {
        rows.push(`<tr><td>${base}</td><td><img src="${path.basename(tsPath)}" width="240"/> (no ref)</td></tr>`);
      }
    } catch (error) {
      rows.push(`<tr><td>${test.design}</td><td>${error instanceof Error ? error.message : String(error)}</td></tr>`);
    }
  }
  await rm(tmp, { recursive: true, force: true });
  return rows;
}

async function main() {
  const zips = process.argv.slice(2);
  if (!zips.length) {
    console.error("Usage: npx tsx scripts/uvgrid-parity.ts path/to/kpb.zip path/to/stripe.zip");
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), "tmp", "uvgrid-parity");
  await mkdir(outDir, { recursive: true });
  const allRows: string[] = [];
  for (const zip of zips) {
    allRows.push(...(await processZip(zip, outDir)));
  }
  const html = `<!doctype html><html><body><h1>uvgrid parity</h1><table>${allRows.join("")}</table><p>Left: TS render, Right: out/ reference</p></body></html>`;
  await writeFile(path.join(outDir, "index.html"), html);
  console.log("Report:", path.join(outDir, "index.html"));
}

void main();
