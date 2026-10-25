# Подключение рендера ZIP-шаблонов (uvgrid) — инструкция для Cursor

`uvgridRender.ts` — **готовый и проверенный** рендер по SPEC 5.7.4. Совпадает с эталоном `render.py`
(среднее расхождение 0.3 из 255). НЕ переписывать формулу — только подключить. Свою текущую реализацию
рендера ZIP-шаблонов заменить на этот модуль.

## 1. Куда положить
| Файл комплекта | Куда в проекте |
|---|---|
| `uvgridRender.ts` | `src/lib/mockup/uvgridRender.ts` |
| `render.py`, `parity-test.mjs`, `expected/`, `test-designs/` | `scripts/uvgrid/` |
| `kpb_template_package.zip` распаковать | `samples/templates/kpb/` (внутри будет `template/…`) |
| `stripe_sateen_template.zip` распаковать | `samples/templates/sateen/` |

Проверка: `npx tsx scripts/uvgrid/parity-test.mjs` → все строки `OK`.

## 2. Функция
```ts
renderUvgrid(template, background, layers, fill, opts) → { width, height, data }  // RGBA, как ImageData
```
- `template` — объект из `template.json`.
- `background`, `layers[zoneId].mask/shade/weave/gloss` — RGBA **полного размера** `template.size`.
  ⚠️ НИЧЕГО заранее не уменьшать. Для быстрого превью — `opts.outputScale: 0.4`, модуль сам пересчитает сетку.
  (Прошлая ошибка: слои уменьшали до 1000 px, а сетку нет → рисунок не ложился.)
- `fill`:
  - рисунок: `{ kind: 'design', tile, tileWidthCm, tileHeightCm }`. `tileWidthCm` — сколько см ткани
    занимает **ширина картинки в пикселях**, `tileHeightCm` — высота. Из формы ткани:
    если картинка шире, чем выше → `tileWidthCm = длинная сторона`, `tileHeightCm = короткая (раппорт)`; иначе наоборот.
  - страйп-сатин: `{ kind: 'stripes', stripes: [{ widthCm, color: '#rrggbb', shiny }] }` — только для `finish: 'sateen'`.
- `opts`: `scale` (0.1–10), `rot` (°), `du`, `dv` (сдвиг, см), `perZone: { [zoneId]: {scale, rot, du, dv} }`,
  `outputScale` (превью). Остальное по умолчанию.
- При несовпадении размеров или нехватке слоёв функция **бросает ошибку с текстом по-русски** —
  показывать её в интерфейсе, не глотать.

## 3. Загрузка картинок в браузере (ImageData)
```ts
async function loadRGBA(url: string): Promise<RGBA> {
  const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
  if (!res.ok) throw new Error(`Не загрузился слой ${url}: ${res.status}`);
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = new OffscreenCanvas(bmp.width, bmp.height); const g = c.getContext('2d')!;
  g.drawImage(bmp, 0, 0); return g.getImageData(0, 0, bmp.width, bmp.height);
}
```
- Если `fetch` падает по CORS — сделать same-origin прокси `/api/img?url=…` (только для домена хранилища).
- Маски и shade — PNG, **не** конвертировать в JPEG/WebP при импорте (потеря точности маски).
- Слои шаблона кэшировать в памяти на время работы мастера (грузятся один раз).

## 4. Превью в MockupAdjuster
- Рендер в **Web Worker** (передавать `data.buffer` как transferable). Ползунки — debounce 120 мс.
- Превью: `outputScale = 0.4` (≈0.5 с). Финал: `outputScale = 1`.
- Результат → `ImageData` → canvas на экране.

## 5. Сохранение макета
- Финальный рендер `outputScale: 1` → OffscreenCanvas → `convertToBlob({ type: 'image/webp', quality: 0.9 })`
  (2000 px по длинной стороне — уменьшить через drawImage) + вариант 600 px.
- Загрузка через `src/lib/storage.ts` (Vercel Blob) → в `fabric.mockups[]` писать `url`, `webUrl`, `thumbUrl`.
- Каталог показывает только реально существующие `webUrl/thumbUrl` (сейчас в каталоге битая картинка и чёрный блок — исправить).

## 6. Отладка, если рисунок не виден
Вывести в консоль: `template.size`, размер фона, размеры каждой маски, число пикселей маски > 127 по зонам,
первые значения `uvGrid.u/v`. Если пикселей маски 0 — маски не загрузились (CORS/путь `template/` в ZIP).

## 7. Тканые ткани: страйп-сатин и жаккард (режим `weave`)

Проблема: у тканых тканей узор — это переплетение и блеск, а не печать. Фото реальной ткани
(со складками и бликами) **нельзя** класть плиткой на макет — получается «мозаика».

### Решение
| Где | Что показываем |
|---|---|
| Каталог, карточка ткани, первая вкладка окна дизайна | **Реальное фото ткани**, которое загрузил дизайнер (как есть, с зумом) |
| Макеты | Шаблон с `finish: 'sateen'` + **только цвет** ткани + узор переплетения (полосы / схема жаккарда) |

### Форма ткани (мастер, шаг 1)
- Галочка **«Тканый рисунок (жаккард / страйп-сатин)»** → `fabric.woven = true`.
  Автоматически включается для типов ткани с признаком `woven` в справочнике (страйп-сатин, жаккард, дамаск).
- Когда галочка стоит, поле «Рисунок» называется **«Фото ткани»**, и появляются:
  1. **Цвет ткани** — по умолчанию `pickFabricColor(фото)` (из uvgridRender.ts), рядом пипетка
     (клик по фото берёт цвет) и выбор цвета вручную. Ползунок «светлее / темнее» (correction 0.8–1.4).
  2. **Узор переплетения** (радиокнопки):
     - **Полосы** — список полос `[{ширина см, блестящая/матовая}]`, пресеты: 0.5+0.5, 1+1, 1.25+1.25, 2+2, 3+1 см;
     - **Схема жаккарда** — загрузка ч/б картинки (белое = блестящее, чёрное = матовое) + ширина раппорта, см.
       Обычно это файл дизайна жаккарда из CAD, не фото;
     - **Без узора** — гладкий сатин одного цвета.
- Сохраняется в `fabric.weave = { color, correction, pattern: 'stripes'|'map'|'none', stripes?, mapUrl?, mapWidthCm? }`.

### Макеты (шаг 3)
- Для `woven = true` показывать только шаблоны с `finish: 'sateen'` (остальные — серые, с подписью «для тканых тканей не подходит»).
- Рендер: `renderUvgrid(tpl, bg, layers, { kind: 'weave', color, stripes | map+mapWidthCm }, opts)`.
  Масштаб, поворот, сдвиг работают как обычно (поворот 90° = вертикальная полоса).
- Тест: строки `weave_*` в parity-test.

### Каталог
- `fabric.design.webUrl` (фото ткани) — в карточке и в окне дизайна, вкладка «Ткань».
- `fabric.mockups[]` — вкладки изделий, как у остальных тканей.
- Цвет и узор (например «Полоса 1 см · сатин») выводить в характеристиках.

## 8. Новые необязательные поля шаблона (шаблон `kpb_plain_template.zip`)

Старые шаблоны их не используют и рендерятся как раньше. `uvgridRender.ts` уже поддерживает всё ниже —
нужно только, чтобы **импорт ZIP** сохранял и передавал в рендер новые слои.

| Поле | Импорт ZIP | Рендер |
|---|---|---|
| zone `light: "light_<id>.png"` | сохранить как остальные слои (PNG, RGB) | `layers[id].light` |
| `softMasks: true` | маски сохранять **без изменений** (не бинаризовать!) | учитывается сам |
| `shadeKnee`, `highlightRolloff`, `referenceColor` | сохранить в template.json | учитывается сам |
| `weaveCapable: true` | — | в мастере ткани показывать этот шаблон и для тканых (раздел 7), не только `finish: 'sateen'` |

- Расположение для теста: распаковать `kpb_plain_template.zip` в `samples/templates/kpb-plain/` (файлы лежат в корне архива).
- parity-test: 14 строк, все должны быть OK.
- Проверка шаблона на сайте: режим «Тканый рисунок → Без узора», цвет `#9bb1bc` (referenceColor) — макет должен выглядеть как исходное фото.
