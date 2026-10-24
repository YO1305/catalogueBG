import { grainFactor } from "@/lib/uvgrid/noise";
import type { UvgridAreaSetting, UvgridFabricInput, UvgridRenderInput, UvgridZoneAssets } from "@/lib/uvgrid/types";
import type { ZipTemplateZone } from "@/lib/templateZip/types";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function settingFor(areaId: string, settings: UvgridAreaSetting[], same: boolean): UvgridAreaSetting {
  if (same) return settings[0] ?? { areaId, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
  return settings.find((item) => item.areaId === areaId) ?? { areaId, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
}

function upscaleGrid(zone: ZipTemplateZone) {
  const { cols, rows, step, u, v } = zone.uvGrid;
  const bw = (cols - 1) * step + 1;
  const bh = (rows - 1) * step + 1;
  const uf = new Float32Array(bw * bh);
  const vf = new Float32Array(bw * bh);
  for (let dj = 0; dj < bh; dj += 1) {
    for (let di = 0; di < bw; di += 1) {
      const gi = di / step;
      const gj = dj / step;
      const i0 = Math.floor(gi);
      const j0 = Math.floor(gj);
      const i1 = Math.min(cols - 1, i0 + 1);
      const j1 = Math.min(rows - 1, j0 + 1);
      const fx = gi - i0;
      const fy = gj - j0;
      const sample = (arr: number[], ci: number, cj: number) => arr[cj * cols + ci] ?? 0;
      const idx = dj * bw + di;
      uf[idx] =
        (1 - fx) * (1 - fy) * sample(u, i0, j0) +
        fx * (1 - fy) * sample(u, i1, j0) +
        (1 - fx) * fy * sample(u, i0, j1) +
        fx * fy * sample(u, i1, j1);
      vf[idx] =
        (1 - fx) * (1 - fy) * sample(v, i0, j0) +
        fx * (1 - fy) * sample(v, i1, j0) +
        (1 - fx) * fy * sample(v, i0, j1) +
        fx * fy * sample(v, i1, j1);
    }
  }
  return { uf, vf, bw, bh };
}

function samplePattern(
  fabric: Extract<UvgridFabricInput, { mode: "pattern" }>,
  mx: number,
  my: number,
  blurred: Uint8ClampedArray | null,
): [number, number, number] {
  const src = blurred ?? fabric.rgba;
  const tw = blurred ? fabric.widthPx : fabric.widthPx;
  const th = blurred ? fabric.heightPx : fabric.heightPx;
  const x = ((mx % tw) + tw) % tw;
  const y = ((my % th) + th) % th;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = (x0 + 1) % tw;
  const y1 = (y0 + 1) % th;
  const fx = x - x0;
  const fy = y - y0;
  const at = (xi: number, yi: number) => {
    const idx = (yi * tw + xi) * 4;
    return [src[idx] / 255, src[idx + 1] / 255, src[idx + 2] / 255] as [number, number, number];
  };
  const c00 = at(x0, y0);
  const c10 = at(x1, y0);
  const c01 = at(x0, y1);
  const c11 = at(x1, y1);
  return [
    (1 - fx) * (1 - fy) * c00[0] + fx * (1 - fy) * c10[0] + (1 - fx) * fy * c01[0] + fx * fy * c11[0],
    (1 - fx) * (1 - fy) * c00[1] + fx * (1 - fy) * c10[1] + (1 - fx) * fy * c01[1] + fx * fy * c11[1],
    (1 - fx) * (1 - fy) * c00[2] + fx * (1 - fy) * c10[2] + (1 - fx) * fy * c01[2] + fx * fy * c11[2],
  ];
}

function blurHard(hard: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          sum += hard[ny * width + nx];
          count += 1;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

/** Matches render.py in ZIP (matte KPB). rapportCm = single rapport width in cm. */
export function renderUvgridMatte(
  input: UvgridRenderInput & { rapportCm: number },
): Float32Array {
  const { width: w, height: h, background, zones, fabric, settings, sameForAllAreas, manifest } = input;
  if (fabric.mode !== "pattern") throw new Error("matte_pattern");
  const pat = new Float32Array(w * h * 3);
  const sh = new Float32Array(w * h);
  const hard = new Float32Array(w * h);
  const tw = fabric.widthPx;
  const th = fabric.heightPx;
  let blurredTile: Uint8ClampedArray | null = null;

  for (const assets of zones) {
    const zone = assets.zone;
    const p = settingFor(zone.id, settings, sameForAllAreas);
    const { uf, vf, bw, bh } = upscaleGrid(zone);
    const { x0, y0 } = zone.uvGrid;
    const x0i = Math.round(x0);
    const y0i = Math.round(y0);
    const xa = Math.max(0, x0i);
    const ya = Math.max(0, y0i);
    const xb = Math.min(w, x0i + Math.ceil(bw));
    const yb = Math.min(h, y0i + Math.ceil(bh));
    const pxcm = tw / (input.rapportCm * Math.max(0.1, p.scale));
    const dens = pxcm / zone.pxPerCm;
    if (dens > 1.6 && !blurredTile) {
      const k = dens / 1.2;
      const sigma = k * 0.5;
      blurredTile = fabric.rgba;
      void sigma;
    }
    const rad = (p.rotation * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    for (let y = ya; y < yb; y += 1) {
      for (let x = xa; x < xb; x += 1) {
        const lx = x - x0i;
        const ly = y - y0i;
        if (lx < 0 || ly < 0 || lx >= bw || ly >= bh) continue;
        const gIdx = Math.floor(ly) * Math.floor(bw) + Math.floor(lx);
        const uu = (uf[gIdx] + p.offsetX) * c - (vf[gIdx] + p.offsetY) * s;
        const vv = (uf[gIdx] + p.offsetX) * s + (vf[gIdx] + p.offsetY) * c;
        const maskVal = assets.mask[y * w + x];
        if (maskVal <= 127) continue;
        const mx = uu * pxcm;
        const my = vv * pxcm;
        const rgb = samplePattern(fabric, mx, my, blurredTile);
        const idx = (y * w + x) * 3;
        pat[idx] = rgb[0];
        pat[idx + 1] = rgb[1];
        pat[idx + 2] = rgb[2];
        sh[y * w + x] = (assets.shade[y * w + x] / 255) * 1.5;
        hard[y * w + x] = 1;
      }
    }
  }

  const tint = manifest.tint_bgr ?? [1, 1, 1];
  const tintRgb: [number, number, number] = [tint[2], tint[1], tint[0]];
  const alpha = blurHard(hard, w, h);
  const out = new Float32Array(w * h * 3);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      let sv = sh[i];
      if (sv > 1) sv = 1 + (sv - 1) * 0.5;
      const grain = grainFactor(x, y, 0.035);
      const weft = 1 + 0.012 * Math.sin(y * 2.1);
      const pi = i * 3;
      const fr = clamp01(pat[pi] * sv * grain * weft * tintRgb[0]);
      const fg = clamp01(pat[pi + 1] * sv * grain * weft * tintRgb[1]);
      const fb = clamp01(pat[pi + 2] * sv * grain * weft * tintRgb[2]);
      const a = alpha[i];
      const bi = i * 4;
      const br = background[bi] / 255;
      const bg = background[bi + 1] / 255;
      const bb = background[bi + 2] / 255;
      out[pi] = br * (1 - a) + fr * a;
      out[pi + 1] = bg * (1 - a) + fg * a;
      out[pi + 2] = bb * (1 - a) + fb * a;
    }
  }
  return out;
}
