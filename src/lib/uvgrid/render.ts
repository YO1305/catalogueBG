import { grainFactor } from "@/lib/uvgrid/noise";
import { renderUvgridMatte } from "@/lib/uvgrid/renderMatte";
import type { UvgridAreaSetting, UvgridFabricInput, UvgridRenderInput, UvgridZoneAssets } from "@/lib/uvgrid/types";
import type { ZipTemplateZone } from "@/lib/templateZip/types";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function settingFor(areaId: string, settings: UvgridAreaSetting[], same: boolean): UvgridAreaSetting {
  if (same) return settings[0] ?? { areaId, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
  return settings.find((item) => item.areaId === areaId) ?? { areaId, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
}

function upscaleGrid(zone: ZipTemplateZone): { u: Float32Array; v: Float32Array; gridW: number; gridH: number } {
  const { cols, rows, step, u, v } = zone.uvGrid;
  const gridW = (cols - 1) * step + 1;
  const gridH = (rows - 1) * step + 1;
  const uOut = new Float32Array(gridW * gridH);
  const vOut = new Float32Array(gridW * gridH);
  for (let dj = 0; dj < gridH; dj += 1) {
    for (let di = 0; di < gridW; di += 1) {
      const gi = di / step;
      const gj = dj / step;
      const i0 = Math.floor(gi);
      const j0 = Math.floor(gj);
      const i1 = Math.min(cols - 1, i0 + 1);
      const j1 = Math.min(rows - 1, j0 + 1);
      const fx = gi - i0;
      const fy = gj - j0;
      const sample = (arr: number[], ci: number, cj: number) => arr[cj * cols + ci] ?? 0;
      const u00 = sample(u, i0, j0);
      const u10 = sample(u, i1, j0);
      const u01 = sample(u, i0, j1);
      const u11 = sample(u, i1, j1);
      const v00 = sample(v, i0, j0);
      const v10 = sample(v, i1, j0);
      const v01 = sample(v, i0, j1);
      const v11 = sample(v, i1, j1);
      const idx = dj * gridW + di;
      uOut[idx] = (1 - fx) * (1 - fy) * u00 + fx * (1 - fy) * u10 + (1 - fx) * fy * u01 + fx * fy * u11;
      vOut[idx] = (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
    }
  }
  return { u: uOut, v: vOut, gridW, gridH };
}

function transformUv(u: number, v: number, setting: UvgridAreaSetting) {
  const du = setting.offsetX;
  const dv = setting.offsetY;
  const rad = (setting.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const uu = (u + du) * cos - (v + dv) * sin;
  const vv = (u + du) * sin + (v + dv) * cos;
  return { uu, vv };
}

function samplePatternRgba(
  fabric: Extract<UvgridFabricInput, { mode: "pattern" }>,
  uu: number,
  vv: number,
  scale: number,
  pxPerCm: number,
): { rgb: [number, number, number]; band: number } {
  const rapport = Math.max(0.01, fabric.rapportWidthCm * scale);
  const pxcm = fabric.widthPx / rapport;
  const x = ((uu * pxcm) % fabric.widthPx + fabric.widthPx) % fabric.widthPx;
  const y = ((vv * pxcm) % fabric.heightPx + fabric.heightPx) % fabric.heightPx;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = (x0 + 1) % fabric.widthPx;
  const y1 = (y0 + 1) % fabric.heightPx;
  const fx = x - x0;
  const fy = y - y0;
  const at = (xi: number, yi: number) => {
    const idx = (yi * fabric.widthPx + xi) * 4;
    return [fabric.rgba[idx] / 255, fabric.rgba[idx + 1] / 255, fabric.rgba[idx + 2] / 255] as [number, number, number];
  };
  const c00 = at(x0, y0);
  const c10 = at(x1, y0);
  const c01 = at(x0, y1);
  const c11 = at(x1, y1);
  const rgb: [number, number, number] = [
    (1 - fx) * (1 - fy) * c00[0] + fx * (1 - fy) * c10[0] + (1 - fx) * fy * c01[0] + fx * fy * c11[0],
    (1 - fx) * (1 - fy) * c00[1] + fx * (1 - fy) * c10[1] + (1 - fx) * fy * c01[1] + fx * fy * c11[1],
    (1 - fx) * (1 - fy) * c00[2] + fx * (1 - fy) * c10[2] + (1 - fx) * fy * c01[2] + fx * fy * c11[2],
  ];
  void pxPerCm;
  return { rgb, band: 0 };
}

function sampleStripe(
  fabric: Extract<UvgridFabricInput, { mode: "stripes" }>,
  vv: number,
  scale: number,
  pxPerCm: number,
): { rgb: [number, number, number]; band: number } {
  const period = fabric.stripes.reduce((sum, stripe) => sum + stripe.widthCm, 0);
  if (period <= 0) return { rgb: [0.9, 0.9, 0.9], band: 0 };
  const aa = 0.6 / (pxPerCm * Math.max(0.1, scale));
  let t = ((vv / Math.max(0.1, scale)) % period + period) % period;
  let acc = 0;
  for (const stripe of fabric.stripes) {
    const next = acc + stripe.widthCm;
    if (t >= acc && t < next) {
      const edge = Math.min(t - acc, next - t);
      const blend = edge < aa ? edge / aa : 1;
      const band = stripe.shiny ? 1 : -1;
      return { rgb: stripe.color.map((c) => c * blend) as [number, number, number], band: band * blend };
    }
    acc = next;
  }
  const last = fabric.stripes[fabric.stripes.length - 1];
  return { rgb: last.color, band: last.shiny ? 1 : -1 };
}

function fabricColor(
  fabric: UvgridFabricInput,
  uu: number,
  vv: number,
  scale: number,
  pxPerCm: number,
): { rgb: [number, number, number]; band: number } {
  if (fabric.mode === "pattern") return samplePatternRgba(fabric, uu, vv, scale, pxPerCm);
  return sampleStripe(fabric, vv, scale, pxPerCm);
}

function blurMaskAlpha(mask: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          sum += mask[ny * width + nx];
          count += 1;
        }
      }
      out[y * width + x] = sum / count / 255;
    }
  }
  return out;
}

function tintRgb(manifest: UvgridRenderInput["manifest"]): [number, number, number] {
  const t = manifest.tint_bgr;
  if (!t) return [1, 1, 1];
  return [t[2], t[1], t[0]];
}

function renderZone(
  output: Float32Array,
  width: number,
  height: number,
  assets: UvgridZoneAssets,
  fabric: UvgridFabricInput,
  setting: UvgridAreaSetting,
  manifest: UvgridRenderInput["manifest"],
  weaveContrast: number,
) {
  const { zone, mask, shade, weave, gloss } = assets;
  const { x0, y0 } = zone.uvGrid;
  const { u, v, gridW, gridH } = upscaleGrid(zone);
  const isSateen = manifest.finish === "sateen";
  const matte = manifest.finish !== "sateen";
  const grainAmp = matte ? 0.02 : 0.008;
  const tint = tintRgb(manifest);
  const alphaBlur = blurMaskAlpha(mask, width, height);
  const x1 = Math.min(width, x0 + gridW);
  const y1 = Math.min(height, y0 + gridH);

  for (let y = Math.max(0, y0); y < y1; y += 1) {
    for (let x = Math.max(0, x0); x < x1; x += 1) {
      const lx = x - x0;
      const ly = y - y0;
      const gIdx = ly * gridW + lx;
      const m = mask[y * width + x] / 255;
      if (m <= 0 && alphaBlur[y * width + x] <= 0) continue;
      const { uu, vv } = transformUv(u[gIdx] ?? 0, v[gIdx] ?? 0, setting);
      const { rgb, band } = fabricColor(fabric, uu, vv, setting.scale, zone.pxPerCm);
      let s = (shade[y * width + x] * 1.5) / 255;
      if (s > 1) s = 1 + (s - 1) * 0.55;
      let weaveMult = 1;
      if (isSateen && weave) {
        const w = (weave[y * width + x] * 0.5) / 255;
        weaveMult = 1 + weaveContrast * w * band;
      }
      const grain = grainFactor(x, y, grainAmp);
      let r = clamp01(rgb[0] * s * weaveMult * grain * tint[0]);
      let g = clamp01(rgb[1] * s * weaveMult * grain * tint[1]);
      let b = clamp01(rgb[2] * s * weaveMult * grain * tint[2]);
      if (isSateen && gloss) {
        const gv = (gloss[y * width + x] / 255) * 0.35 * (0.6 + 0.4 * Math.max(band, 0));
        const spec = [1.0, 0.98, 0.97];
        r = 1 - (1 - r) * (1 - gv * spec[0]);
        g = 1 - (1 - g) * (1 - gv * spec[1]);
        b = 1 - (1 - b) * (1 - gv * spec[2]);
      }
      const a = alphaBlur[y * width + x];
      const idx = (y * width + x) * 3;
      output[idx] = output[idx] * (1 - a) + r * a;
      output[idx + 1] = output[idx + 1] * (1 - a) + g * a;
      output[idx + 2] = output[idx + 2] * (1 - a) + b * a;
    }
  }
}

/** RGB float 0..1, length width*height*3 */
export function renderUvgrid(input: UvgridRenderInput & { rapportCm?: number }): Float32Array {
  if (input.manifest.finish !== "sateen") {
    const rapportCm =
      input.rapportCm ??
      (input.fabric.mode === "pattern" ? input.fabric.rapportWidthCm || 8 : 8);
    return renderUvgridMatte({ ...input, rapportCm });
  }
  const { width, height, background, zones, fabric, settings, sameForAllAreas, manifest } = input;
  const weaveContrast = input.weaveContrast ?? 1;
  const out = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    out[i * 3] = background[i * 4] / 255;
    out[i * 3 + 1] = background[i * 4 + 1] / 255;
    out[i * 3 + 2] = background[i * 4 + 2] / 255;
  }
  for (const assets of zones) {
    const setting = settingFor(assets.zone.id, settings, sameForAllAreas);
    renderZone(out, width, height, assets, fabric, setting, manifest, weaveContrast);
  }
  return out;
}

export function floatRgbToRgba(flat: Float32Array, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = Math.round(clamp01(flat[i * 3]) * 255);
    rgba[i * 4 + 1] = Math.round(clamp01(flat[i * 3 + 1]) * 255);
    rgba[i * 4 + 2] = Math.round(clamp01(flat[i * 3 + 2]) * 255);
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

export function renderUvgridToCanvas(canvas: HTMLCanvasElement, input: UvgridRenderInput) {
  const flat = renderUvgrid(input);
  const rgba = floatRgbToRgba(flat, input.width, input.height);
  canvas.width = input.width;
  canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), input.width, input.height), 0, 0);
}
