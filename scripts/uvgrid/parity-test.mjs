// Тест совпадения TS-рендера с эталоном (Python). Запуск из корня проекта:
//   npm i -D pngjs jpeg-js tsx
//   npx tsx scripts/uvgrid/parity-test.mjs  (пути ниже поправить под проект)
// Ожидается: mean < 1, p99 <= 3 для каждого теста.
import fs from 'node:fs'; import path from 'node:path'; import { PNG } from 'pngjs'; import jpeg from 'jpeg-js';
import { renderUvgrid } from '../../src/lib/mockup/uvgridRender.ts';
const KIT = 'scripts/uvgrid', KPB = 'samples/templates/kpb/template', SS = 'samples/templates/sateen/template', PL = 'samples/templates/kpb-plain', F3 = 'samples/templates/fabric-poplin-drape', F1 = 'samples/templates/fabric-stripe-sateen-waves';
const load = p => { const b = fs.readFileSync(p); if (p.endsWith('.png')) { const i = PNG.sync.read(b); return { width: i.width, height: i.height, data: i.data }; }
  const i = jpeg.decode(b, { useTArray: true, maxMemoryUsageInMB: 2048 }); return { width: i.width, height: i.height, data: i.data }; };
function tpl(dir) { const T = JSON.parse(fs.readFileSync(path.join(dir, 'template.json'))); const L = {};
  for (const z of T.zones) { L[z.id] = { mask: load(path.join(dir, z.mask)), shade: load(path.join(dir, z.shade)) };
    if (z.weave) L[z.id].weave = load(path.join(dir, z.weave)); if (z.gloss) L[z.id].gloss = load(path.join(dir, z.gloss));
    if (z.light) L[z.id].light = load(path.join(dir, z.light)); }
  return { T, bg: load(path.join(dir, T.background || 'background.jpg')), L }; }
const d = n => load(path.join(KIT, 'test-designs', n));
const cases = [
  ['kpb_floral.png', KPB, { kind: 'design', tile: d('floral_lavanda.png'), tileWidthCm: 40 }, {}],
  ['kpb_stripe_x3_rot90.png', KPB, { kind: 'design', tile: d('stripe_grafit.png'), tileWidthCm: 32 }, { scale: 3, rot: 90 }],
  ['kpb_wide_180x64.png', KPB, { kind: 'design', tile: d('wide_2400x1010.png'), tileWidthCm: 180, tileHeightCm: 64 }, {}],
  ['sateen_graphite_2cm.png', SS, { kind: 'stripes', stripes: [{ widthCm: 2, color: '#5c6168', shiny: true }, { widthCm: 2, color: '#5c6168', shiny: false }] }, {}],
  ['sateen_floral.png', SS, { kind: 'design', tile: d('floral_lavanda.png'), tileWidthCm: 40 }, {}],
  // тканые (жаккард / страйп-сатин): фото ткани на макет не кладётся — только цвет + узор
  ['weave_rose_stripes.png', SS, { kind: 'weave', color: '#cab1a9', stripes: [{ widthCm: 1.25, shiny: true }, { widthCm: 1.25, shiny: false }] }, {}],
  ['weave_grey_stripes_1cm.png', SS, { kind: 'weave', color: '#b4a6a2', stripes: [{ widthCm: 1, shiny: true }, { widthCm: 1, shiny: false }] }, {}],
  ['weave_jacquard_navy.png', SS, { kind: 'weave', color: '#3d5a7a', map: d('jacquard_map.png'), mapWidthCm: 30 }, {}],
  ['weave_plain_cream.png', SS, { kind: 'weave', color: '#e9e4dc' }, {}],
  // однотонный шаблон (мягкие края, слой света, roll-off)
  ['plain_navy.png', PL, { kind: 'weave', color: '#24324f' }, {}],
  ['plain_white.png', PL, { kind: 'weave', color: '#f3f1ec' }, {}],
  ['plain_floral_x1.3_r15.png', PL, { kind: 'design', tile: d('floral_lavanda.png'), tileWidthCm: 40 }, { scale: 1.3, rot: 15 }],
  ['plain_stripe_champagne.png', PL, { kind: 'weave', color: '#e6d5bd', stripes: [{ widthCm: 1, shiny: true }, { widthCm: 1, shiny: false }] }, {}],
  // мокапы ткани (кадр целиком ткань, shadeScale 1.75)
  ['fabric_poplin_floral.png', F3, { kind: 'design', tile: d('floral_lavanda.png'), tileWidthCm: 16 }, {}],
  ['fabric_stripesateen_champagne.png', F1, { kind: 'weave', color: '#e6d5bd' }, {}],
  ['weave_on_matte_kpb.png', KPB, { kind: 'weave', color: '#b4a6a2', stripes: [{ widthCm: 1, shiny: true }, { widthCm: 1, shiny: false }] }, {}],
];
let ok = true;
for (const [name, dir, fill, opts] of cases) {
  const { T, bg, L } = tpl(dir); const t0 = Date.now(); const r = renderUvgrid(T, bg, L, fill, opts); const ms = Date.now() - t0;
  const e = load(path.join(KIT, 'expected', name)); const diffs = [];
  for (let p = 0; p < r.width * r.height; p++) for (let c = 0; c < 3; c++) diffs.push(Math.abs(r.data[p * 4 + c] - e.data[p * 4 + c]));
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length; diffs.sort((a, b) => a - b); const p99 = diffs[Math.floor(diffs.length * 0.99)];
  const pass = mean < 1 && p99 <= 3; ok &&= pass;
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}  mean=${mean.toFixed(3)} p99=${p99}  ${ms} ms`);
  const png = new PNG({ width: r.width, height: r.height }); png.data = Buffer.from(r.data); fs.writeFileSync(path.join(KIT, 'actual_' + name), PNG.sync.write(png));
}
process.exit(ok ? 0 : 1);
