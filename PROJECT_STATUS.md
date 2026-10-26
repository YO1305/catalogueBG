# PROJECT_STATUS

Обновлено: 2026-10-26

## Рендер макетов (uvgrid)

- Источник правды: `kit/uvgridRender.ts` → `src/lib/mockup/uvgridRender.ts` (не дублировать формулы).
- Parity: `npx tsx scripts/uvgrid/parity-test.mjs` — **16/16 OK** (в т.ч. мокапы ткани `fabric-poplin-drape`, `fabric-stripe-sateen-waves`).
- Поле **`shadeScale`** в template.json (мокапы ткани ≈ 1.75).
- Превью: Web Worker, `outputScale: 0.5`; финал: `outputScale: 1`, JPEG 0.92 → `/api/mockups/save` → WebP 2000 / 1200 / **800** px.

## Этап 3c — мокапы ткани (SPEC 5.8)

- Шаг **«Мокапы ткани»** в редакторе ткани; изделие `fabric` в справочнике.
- Импорт ZIP: `shadeScale`, `light_*`, `softMasks`, `product` / `fabricView` / `texture`; качество шаблона (мин. 1500 px).
- Каталог для **printed**: плоский рисунок убирается из JSON (`sanitizePublicFabric`); карточка — **главный мокап ткани**.
- Новые загрузки рисунка: `private/designs/{id}/…`, WebP до **4000 px**.

## После деплоя проверить

1. Parity локально (16 OK).
2. Импорт `kit/kpb_plain_template.zip` + `kit/fabric-*.zip`.
3. Ткань «Рисунок»: мокапы ткани → главный → сохранить WebP → опубликовать.
4. Каталог: нет URL `private/designs` / плоского webUrl в HTML (View Source).
5. `npm run build`.
