/**
 * uvgridRender.ts — рендер макета по ZIP-шаблону (SPEC 5.7.4).
 * Чистая функция без DOM и зависимостей: работает в браузере (canvas → ImageData),
 * в Web Worker и на сервере (Node + sharp/pngjs). Эталон — render.py, расхождение < 2/255.
 *
 * Все картинки — RGBA (как ImageData). Маски/свет/weave/gloss читаются по каналу R.
 * Все слои шаблона должны быть ПОЛНОГО размера template.size (как в ZIP).
 * Для быстрого превью используйте opts.outputScale (0.25–0.5): сетка и слои
 * пересчитываются сами, ничего масштабировать заранее НЕ нужно.
 */

export type RGBA = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

export interface UvGrid { x0: number; y0: number; step: number; cols: number; rows: number; u: number[]; v: number[] }
export interface TemplateZone {
  id: string; label?: string; mask: string; shade: string; weave?: string; gloss?: string;
  /** RGB-слой цвета освещения (тёплый/холодный свет), value/255*2, 1.0 = 128. Необязательный. */
  light?: string;
  pxPerCm: number; uvGrid: UvGrid;
}
export interface TemplateJson {
  name?: string; finish?: 'sateen' | 'matte'; size: [number, number];
  tint_bgr?: [number, number, number]; zones: TemplateZone[];
  /** Порог сжатия бликов в shade (по умолчанию 1.0). */
  shadeKnee?: number;
  /** Мягкое «скругление» светлых тонов вместо обрезки (белые ткани не выгорают). */
  highlightRolloff?: boolean;
  /** Шаблон умеет страйп-сатин/жаккард (есть слои weave), хотя finish = matte. */
  weaveCapable?: boolean;
  /** Маски с мягкими краями (0..255 = доля ткани в пикселе). Тогда край не размывается дополнительно. */
  softMasks?: boolean;
  /** Цвет ткани на исходном фото (для проверки: рендер этим цветом ≈ исходное фото). */
  referenceColor?: string;
  /** Множитель shade: value/255 × shadeScale (мокапы ткани ≈ 1.75, КПБ по умолчанию 1.5). */
  shadeScale?: number;
}
export interface ZoneLayers { mask: RGBA; shade: RGBA; weave?: RGBA; gloss?: RGBA; light?: RGBA }

export interface Stripe { widthCm: number; color: string; shiny: boolean }
export type Fill =
  | { kind: 'design'; tile: RGBA; tileWidthCm: number; tileHeightCm?: number }
  | { kind: 'stripes'; stripes: Stripe[] }
  /** Тканый рисунок (страйп-сатин, жаккард): фото ткани на макет НЕ кладётся.
   *  Берётся один цвет + узор переплетения: полосы ИЛИ ч/б схема (белое = блестящее), ИЛИ ничего (гладкий сатин). */
  | { kind: 'weave'; color: string;
      stripes?: { widthCm: number; shiny: boolean }[];
      map?: RGBA; mapWidthCm?: number; mapHeightCm?: number };

export interface Fit { scale?: number; rot?: number; du?: number; dv?: number } // scale 0.1–10, rot в градусах, du/dv в см
export interface RenderOptions extends Fit {
  perZone?: Record<string, Fit>;
  weaveContrast?: number;   // по умолчанию 1.0
  glossStrength?: number;   // по умолчанию 0.35 для sateen, 0 для остальных
  grain?: number;           // по умолчанию 0.008 sateen / 0.02 matte; 0 = выкл
  seed?: number;            // для зерна, по умолчанию 1
  outputScale?: number;     // 1 = полный размер; 0.4 = быстрое превью
}

// ---------- утилиты ----------
function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255];
}
function gaussKernel(s: number): { k: number; w: Float32Array } {
  const k = Math.ceil(s * 3); const w = new Float32Array(2 * k + 1); let sum = 0;
  for (let i = -k; i <= k; i++) { const v = Math.exp(-(i * i) / (2 * s * s)); w[i + k] = v; sum += v; }
  for (let i = 0; i < w.length; i++) w[i] /= sum;
  return { k, w };
}
/** Раздельное гауссово размытие float-массива с nch каналами. wrap=true — по кругу (бесшовный рисунок). */
function gaussBlur(src: Float32Array, W: number, H: number, nch: number, s: number, wrap: boolean): Float32Array {
  if (s <= 0) return src;
  const { k, w } = gaussKernel(s);
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  const mk = (n: number) => { const t = new Int32Array(n * (2 * k + 1)); for (let p = 0; p < n; p++) for (let i = -k; i <= k; i++) { const q = p + i; t[p * (2 * k + 1) + i + k] = wrap ? ((q % n) + n) % n : (q < 0 ? 0 : q >= n ? n - 1 : q); } return t; };
  const ix = mk(W), iy = mk(H), K = 2 * k + 1;
  for (let y = 0; y < H; y++) { const row = y * W; for (let x = 0; x < W; x++) { const base = x * K; for (let c = 0; c < nch; c++) {
    let a = 0; for (let i = 0; i < K; i++) a += w[i] * src[(row + ix[base + i]) * nch + c];
    tmp[(row + x) * nch + c] = a; } } }
  for (let y = 0; y < H; y++) { const base = y * K; for (let x = 0; x < W; x++) { for (let c = 0; c < nch; c++) {
    let a = 0; for (let i = 0; i < K; i++) a += w[i] * tmp[(iy[base + i] * W + x) * nch + c];
    out[(y * W + x) * nch + c] = a; } } }
  return out;
}
/** Гаусс по маске 0/1 (края зажаты): внутри сплошной области = 1, честный расчёт только у краёв — быстро. */
function alphaBlur(A: Float32Array, W: number, H: number, s: number): Float32Array {
  const { k, w } = gaussKernel(s);
  const out = new Float32Array(W * H);
  // интегральное изображение нулей
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += A[y * W + x] > 0 ? 0 : 1; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  const zeros = (x0: number, y0: number, x1: number, y1: number) => I[(y1 + 1) * (W + 1) + x1 + 1] - I[y0 * (W + 1) + x1 + 1] - I[(y1 + 1) * (W + 1) + x0] + I[y0 * (W + 1) + x0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (!(A[p] > 0)) continue;
    const x0 = Math.max(0, x - k), x1 = Math.min(W - 1, x + k), y0 = Math.max(0, y - k), y1 = Math.min(H - 1, y + k);
    if (zeros(x0, y0, x1, y1) === 0) { out[p] = 1; continue; }
    let acc = 0;
    for (let j = -k; j <= k; j++) { const yy = y + j < 0 ? 0 : y + j >= H ? H - 1 : y + j; let r = 0;
      for (let i = -k; i <= k; i++) { const xx = x + i < 0 ? 0 : x + i >= W ? W - 1 : x + i; r += w[i + k] * A[yy * W + xx]; }
      acc += w[j + k] * r; }
    out[p] = acc;
  }
  return out;
}
/** Детерминированный шум [-1,1) — тот же хэш, что в render.py */
function hashNoise(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(seed, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 4294967296) * 2 - 1;
}
/** Билинейное чтение канала R слоя в дробной точке исходного размера */
function sampleR(img: RGBA, sx: number, sy: number): number {
  const W = img.width, H = img.height;
  let x0 = Math.floor(sx), y0 = Math.floor(sy); const fx = sx - x0, fy = sy - y0;
  const cx = (x: number) => x < 0 ? 0 : x >= W ? W - 1 : x, cy = (y: number) => y < 0 ? 0 : y >= H ? H - 1 : y;
  const x1 = cx(x0 + 1), y1 = cy(y0 + 1); x0 = cx(x0); y0 = cy(y0);
  const d = img.data;
  const a = d[(y0 * W + x0) * 4], b = d[(y0 * W + x1) * 4], c = d[(y1 * W + x0) * 4], e = d[(y1 * W + x1) * 4];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
}
function sampleRGB(img: RGBA, sx: number, sy: number, out: Float32Array) {
  const W = img.width, H = img.height;
  let x0 = Math.floor(sx), y0 = Math.floor(sy); const fx = sx - x0, fy = sy - y0;
  const cx = (x: number) => x < 0 ? 0 : x >= W ? W - 1 : x, cy = (y: number) => y < 0 ? 0 : y >= H ? H - 1 : y;
  const x1 = cx(x0 + 1), y1 = cy(y0 + 1); x0 = cx(x0); y0 = cy(y0);
  const d = img.data;
  for (let c = 0; c < 3; c++) {
    const a = d[(y0 * W + x0) * 4 + c], b = d[(y0 * W + x1) * 4 + c], e = d[(y1 * W + x0) * 4 + c], f = d[(y1 * W + x1) * 4 + c];
    out[c] = ((a * (1 - fx) + b * fx) * (1 - fy) + (e * (1 - fx) + f * fx) * fy) / 255;
  }
}
function gridUVInto(g: UvGrid, sx: number, sy: number, out: Float64Array): boolean {
  const gx = (sx - g.x0) / g.step, gy = (sy - g.y0) / g.step;
  if (gx < 0 || gy < 0 || gx > g.cols - 1 || gy > g.rows - 1) return false;
  let i = Math.floor(gx), j = Math.floor(gy);
  if (i >= g.cols - 1) i = g.cols - 2; if (j >= g.rows - 1) j = g.rows - 2;
  const fx = gx - i, fy = gy - j, c = g.cols, k00 = j * c + i, k01 = k00 + c;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  out[0] = g.u[k00] * w00 + g.u[k00 + 1] * w10 + g.u[k01] * w01 + g.u[k01 + 1] * w11;
  out[1] = g.v[k00] * w00 + g.v[k00 + 1] * w10 + g.v[k01] * w01 + g.v[k01 + 1] * w11;
  return true;
}

// ---------- подготовка рисунка против муара (уменьшение + размытие), с кэшем ----------
/** σ = 0.4·плотность. Большое σ → уменьшаем рисунок в d раз (среднее по d×d) и размываем остаток σ/d.
 *  σ квантуется (шаг 0.25), поэтому ползунок масштаба не пересчитывает размытие на каждом движении. */
export function tilePlan(sigma: number): { d: number; s: number } {
  if (sigma <= 0) return { d: 1, s: 0 };
  const d = Math.max(1, Math.floor(sigma / 1.5));
  return { d, s: Math.max(0.25, Math.round((sigma / d) * 4) / 4) };
}
type Prepared = { f: Float32Array; w: number; h: number };
const tileCache = new WeakMap<object, Map<string, Prepared>>();
function prepareTile(tile: RGBA, sigma: number): Prepared {
  const { d, s } = tilePlan(sigma); const key = d + ':' + s;
  let m = tileCache.get(tile.data); if (!m) { m = new Map(); tileCache.set(tile.data, m); }
  const hit = m.get(key); if (hit) return hit;
  const w = Math.max(1, Math.floor(tile.width / d)), h = Math.max(1, Math.floor(tile.height / d));
  const f = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let a = 0; for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) a += tile.data[((y * d + j) * tile.width + x * d + i) * 4 + c];
    f[(y * w + x) * 3 + c] = a / (d * d * 255);
  }
  const res = { f: s > 0 ? gaussBlur(f, w, h, 3, s, true) : f, w, h };
  m.set(key, res); return res;
}

// ---------- главный рендер ----------
export function renderUvgrid(
  tpl: TemplateJson, background: RGBA, layers: Record<string, ZoneLayers>, fillIn: Fill, opts: RenderOptions = {},
): RGBA {
  const SW = background.width, SH = background.height;
  if (SW !== tpl.size[0] || SH !== tpl.size[1]) throw new Error(`Фон ${SW}×${SH} не совпадает с template.size ${tpl.size.join('×')}`);
  for (const z of tpl.zones) {
    const L = layers[z.id]; if (!L) throw new Error(`Нет слоёв для зоны ${z.id}`);
    for (const k of ['mask', 'shade', 'weave', 'gloss', 'light'] as const) {
      const im = L[k]; if (im && (im.width !== SW || im.height !== SH)) throw new Error(`Слой ${k} зоны ${z.id}: ${im.width}×${im.height}, нужно ${SW}×${SH}`);
    }
  }
  const sateen = tpl.finish === 'sateen';
  let fill: Fill = fillIn;
  const f = opts.outputScale ?? 1;
  const W = Math.max(1, Math.round(SW * f)), H = Math.max(1, Math.round(SH * f));
  const glossK = opts.glossStrength ?? (sateen ? 0.35 : 0);
  const grainK = opts.grain ?? (sateen ? 0.008 : 0.02);
  const weaveK = opts.weaveContrast ?? 1.0;
  const seed = opts.seed ?? 1;
  const tb = tpl.tint_bgr ?? [1, 1, 1]; const tint = [tb[2], tb[1], tb[0]]; // BGR → RGB
  const toSrc = (o: number) => f === 1 ? o : (o + 0.5) / f - 0.5;

  // 1) какая зона в каждом пикселе (поздняя перекрывает раннюю) + альфа
  const soft = !!tpl.softMasks;
  const zoneOf = new Int16Array(W * H).fill(-1);
  const A = new Float32Array(W * H);
  const S = soft ? new Float32Array(W * H) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = toSrc(x), sy = toSrc(y); let best = 0;
    for (let zi = 0; zi < tpl.zones.length; zi++) {
      const m = layers[tpl.zones[zi].id].mask;
      const val = f === 1 ? m.data[(sy * SW + sx) * 4] : sampleR(m, sx, sy);
      if (soft) { if (val > 0 && val >= best) { best = val; zoneOf[y * W + x] = zi; } }
      else if (val > 127) zoneOf[y * W + x] = zi;
    }
    if (zoneOf[y * W + x] >= 0) { A[y * W + x] = 1; if (S) S[y * W + x] = best / 255; }
  }
  const Ablur = soft ? A : alphaBlur(A, W, H, 1.0 * f);

  // 2) подготовка заливки
  let stripeEdges: number[] = [], stripeCols: [number, number, number][] = [], stripeSgn: number[] = [], P = 0;
  if (fill.kind === 'weave' && fill.stripes && fill.stripes.length) {
    fill = { kind: 'stripes', stripes: fill.stripes.map(x => ({ widthCm: x.widthCm, color: fill.kind === 'weave' ? fill.color : '#ffffff', shiny: x.shiny })) };
  }
  const weaveColor = fill.kind === 'weave' ? hexToRgb(fill.color) : null;
  if (fill.kind === 'stripes') {
    P = fill.stripes.reduce((s, x) => s + x.widthCm, 0);
    stripeEdges = [0]; for (const s of fill.stripes) stripeEdges.push(stripeEdges[stripeEdges.length - 1] + s.widthCm);
    stripeCols = fill.stripes.map(s => hexToRgb(s.color)); stripeSgn = fill.stripes.map(s => s.shiny ? 1 : -1);
  }

  const bg = new Float32Array(3);
  const out = new Uint8ClampedArray(W * H * 4);
  const fits = tpl.zones.map(z => { const ft = { scale: opts.scale ?? 1, rot: opts.rot ?? 0, du: opts.du ?? 0, dv: opts.dv ?? 0, ...(opts.perZone?.[z.id] ?? {}) };
    const r = ft.rot * Math.PI / 180; return { ...ft, cs: Math.cos(r), sn: Math.sin(r) }; });
  // для рисунка: параметры плитки на зону (размытие против муара зависит от масштаба)
  const zt = tpl.zones.map((z, zi) => {
    let t: RGBA, wCm: number, hCm: number;
    if (fill.kind === 'design') { t = fill.tile; wCm = fill.tileWidthCm; hCm = fill.tileHeightCm ?? wCm * t.height / t.width; }
    else if (fill.kind === 'weave' && fill.map) { t = fill.map; wCm = fill.mapWidthCm ?? 10; hCm = fill.mapHeightCm ?? wCm * t.height / t.width; }
    else return null;
    const ft = fits[zi];
    const dens = Math.max(t.width / (wCm * ft.scale), t.height / (hCm * ft.scale)) / z.pxPerCm;
    const pr = prepareTile(t, dens > 1.6 ? dens * 0.4 : 0);
    return { pxX: pr.w / (wCm * ft.scale), pxY: pr.h / (hCm * ft.scale), tf: pr.f, tw: pr.w, th: pr.h };
  });
  const gc0 = 1.0, gc1 = 0.98, gc2 = 0.97;
  const t0 = tint[0], t1 = tint[1], t2 = tint[2];
  const knee = tpl.shadeKnee ?? 1.0, rolloff = !!tpl.highlightRolloff, shadeScale = tpl.shadeScale ?? 1.5;
  const lt = new Float32Array(3);
  const roll = (v: number) => v <= 0.85 ? v : 0.85 + 0.15 * Math.tanh((v - 0.85) / 0.15);
  const uv = new Float64Array(2);
  const bgd = background.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, p4 = p * 4;
    let b0: number, b1: number, b2: number, sx: number, sy: number;
    if (f === 1) { sx = x; sy = y; b0 = bgd[p4] / 255; b1 = bgd[p4 + 1] / 255; b2 = bgd[p4 + 2] / 255; }
    else { sx = (x + 0.5) / f - 0.5; sy = (y + 0.5) / f - 0.5; sampleRGB(background, sx, sy, bg); b0 = bg[0]; b1 = bg[1]; b2 = bg[2]; }
    const zi = zoneOf[p]; const a = S ? S[p] : A[p] * Ablur[p];
    out[p4 + 3] = 255;
    if (zi < 0 || a <= 0 || !gridUVInto(tpl.zones[zi].uvGrid, sx, sy, uv)) {
      out[p4] = Math.floor(b0 * 255 + 0.5); out[p4 + 1] = Math.floor(b1 * 255 + 0.5); out[p4 + 2] = Math.floor(b2 * 255 + 0.5); continue;
    }
    const z = tpl.zones[zi], L = layers[z.id], ft = fits[zi];
    const U = uv[0] + ft.du, V = uv[1] + ft.dv;
    const uu = U * ft.cs - V * ft.sn, vv = U * ft.sn + V * ft.cs;
    let band = 0, c0 = 0, c1 = 0, c2 = 0;
    const T = zt[zi];
    if (T) {
      const tw = T.tw, th = T.th, tf = T.tf;
      let tx = (uu * T.pxX) % tw; if (tx < 0) tx += tw; let ty = (vv * T.pxY) % th; if (ty < 0) ty += th;
      const x0 = Math.floor(tx), y0 = Math.floor(ty), fx = tx - x0, fy = ty - y0;
      const xa = x0 % tw, xb = (x0 + 1) % tw, ya = (y0 % th) * tw, yb = ((y0 + 1) % th) * tw;
      const i00 = (ya + xa) * 3, i10 = (ya + xb) * 3, i01 = (yb + xa) * 3, i11 = (yb + xb) * 3;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      c0 = tf[i00] * w00 + tf[i10] * w10 + tf[i01] * w01 + tf[i11] * w11;
      c1 = tf[i00 + 1] * w00 + tf[i10 + 1] * w10 + tf[i01 + 1] * w01 + tf[i11 + 1] * w11;
      c2 = tf[i00 + 2] * w00 + tf[i10 + 2] * w10 + tf[i01 + 2] * w01 + tf[i11 + 2] * w11;
      if (weaveColor) { // схема жаккарда: яркость → блестящее/матовое, цвет — один
        band = (0.299 * c0 + 0.587 * c1 + 0.114 * c2) * 2 - 1;
        c0 = weaveColor[0]; c1 = weaveColor[1]; c2 = weaveColor[2];
      }
    } else if (weaveColor) { // гладкий сатин одного цвета
      c0 = weaveColor[0]; c1 = weaveColor[1]; c2 = weaveColor[2];
    } else {
      let t = (vv / ft.scale) % P; if (t < 0) t += P;
      const aa = Math.max(0.6 / z.pxPerCm / ft.scale, 1e-3);
      let ws = 0;
      for (let i = 0; i < stripeCols.length; i++) {
        const a0 = stripeEdges[i], a1 = stripeEdges[i + 1];
        let wg = Math.min(1, Math.max(0, (t - a0) / aa + 0.5)) * Math.min(1, Math.max(0, (a1 - t) / aa + 0.5));
        if (i === 0) wg = Math.max(wg, Math.min(1, Math.max(0, (t - P) / aa + 0.5)));
        if (wg === 0) continue;
        c0 += wg * stripeCols[i][0]; c1 += wg * stripeCols[i][1]; c2 += wg * stripeCols[i][2];
        band += wg * stripeSgn[i]; ws += wg;
      }
      if (ws < 1e-4) ws = 1e-4; c0 /= ws; c1 /= ws; c2 /= ws; band /= ws;
    }
    const q = sy * SW + sx;
    const rs = f === 1 ? L.shade.data[q * 4] : sampleR(L.shade, sx, sy);
    let s = (rs / 255) * shadeScale; if (s > knee) s = knee + (s - knee) * 0.55;
    let l0 = 1, l1 = 1, l2 = 1;
    if (L.light) { if (f === 1) { const ld = L.light.data; l0 = ld[q * 4] / 127.5; l1 = ld[q * 4 + 1] / 127.5; l2 = ld[q * 4 + 2] / 127.5; }
      else { sampleRGB(L.light, sx, sy, lt); l0 = lt[0] * 2; l1 = lt[1] * 2; l2 = lt[2] * 2; } }
    const wv = L.weave ? (f === 1 ? L.weave.data[q * 4] : sampleR(L.weave, sx, sy)) / 255 * 0.5 : 0;
    const gl = L.gloss ? (f === 1 ? L.gloss.data[q * 4] : sampleR(L.gloss, sx, sy)) / 255 : 0;
    const m = s * (1 + weaveK * wv * band) * (grainK > 0 ? 1 + grainK * hashNoise(Math.round(sx), Math.round(sy), seed) / 0.57735 : 1);
    const g = gl * glossK * (0.6 + 0.4 * (band > 0 ? band : 0));
    let v0 = c0 * m * t0 * l0, v1 = c1 * m * t1 * l1, v2 = c2 * m * t2 * l2;
    if (rolloff) { v0 = roll(v0); v1 = roll(v1); v2 = roll(v2); }
    v0 = v0 < 0 ? 0 : v0 > 1 ? 1 : v0; v1 = v1 < 0 ? 0 : v1 > 1 ? 1 : v1; v2 = v2 < 0 ? 0 : v2 > 1 ? 1 : v2;
    if (g > 0) { v0 = 1 - (1 - v0) * (1 - g * gc0); v1 = 1 - (1 - v1) * (1 - g * gc1); v2 = 1 - (1 - v2) * (1 - g * gc2); }
    const r0 = b0 * (1 - a) + v0 * a, r1 = b1 * (1 - a) + v1 * a, r2 = b2 * (1 - a) + v2 * a;
    out[p4] = Math.floor((r0 < 0 ? 0 : r0 > 1 ? 1 : r0) * 255 + 0.5);
    out[p4 + 1] = Math.floor((r1 < 0 ? 0 : r1 > 1 ? 1 : r1) * 255 + 0.5);
    out[p4 + 2] = Math.floor((r2 < 0 ? 0 : r2 > 1 ? 1 : r2) * 255 + 0.5);
  }
  return { width: W, height: H, data: out };
}

/**
 * Цвет ткани по ФОТО реальной ткани (для режима weave): берём средние тона,
 * отбрасывая тени складок (нижние 50%) и блики (верхние 10%). Возвращает '#rrggbb'.
 * correction > 1 осветляет (фото обычно темнее, чем ткань «в руке»), по умолчанию 1.15.
 */
export function pickFabricColor(photo: RGBA, correction = 1.15): string {
  const n = photo.width * photo.height, step = Math.max(1, Math.floor(n / 200000));
  const Ls: number[] = [];
  for (let p = 0; p < n; p += step) { const d = photo.data; Ls.push(0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2]); }
  const sorted = [...Ls].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.5)], hi = sorted[Math.floor(sorted.length * 0.9)];
  let r = 0, g = 0, b = 0, k = 0;
  for (let i = 0, p = 0; p < n; p += step, i++) { const L = Ls[i]; if (L < lo || L > hi) continue;
    r += photo.data[p * 4]; g += photo.data[p * 4 + 1]; b += photo.data[p * 4 + 2]; k++; }
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v / Math.max(k, 1) * correction))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
