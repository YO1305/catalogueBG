# Задача для Cursor (подготовлено Claude, все файлы уже разложены)

Работай по шагам, после каждого шага коротко отчитайся простыми словами. Модель — Claude.

## Шаг 1. Обновить рендер
- Файлы уже на месте: `kit/` (uvgridRender.ts, render.py, parity-test.mjs, INTEGRATION.md, expected/),
  `samples/templates/fabric-poplin-drape/`, `samples/templates/fabric-stripe-sateen-waves/`, `samples/templates/kpb-plain/`.
- Скопируй `kit/uvgridRender.ts` → `src/lib/mockup/uvgridRender.ts`,
  `kit/render.py`, `kit/parity-test.mjs`, `kit/expected/`, `kit/test-designs/` → `scripts/uvgrid/`.
- Запусти `npx tsx scripts/uvgrid/parity-test.mjs` — должно быть 16 строк OK. Покажи вывод.
- Импорт ZIP: сохранять и передавать в рендер новые поля/слои: `shadeScale`, `light_*.png`, `softMasks` (маски НЕ бинаризовать),
  `shadeKnee`, `highlightRolloff`, `weaveCapable`, `referenceColor`, `product`, `fabricView`, `texture` (INTEGRATION.md разделы 8–9).

## Шаг 2. Мокапы ткани и защита дизайна
- Внеси `SPEC_patch_v1.3_fabric_mockups.md` в SPEC.md (раздел 5.8 + правки 6.3, 7.3, 10).
- Сделай этап 3c. Сначала пункт 5.8.6 (качество) — он касается и мокапов КПБ.
- Рендер — только renderUvgrid, свой не писать.
- Проверка в конце: URL плоского рисунка не встречается в HTML/JSON публичной страницы каталога.

## Шаг 3. Push
- Коммит и push. Обнови PROJECT_STATUS.md.
- Напиши мне чек-лист проверки на сайте.

## Что сделаю я сам после деплоя (не твоя задача)
Импорт на сайте: kit/kpb_plain_template.zip (изделие КПБ) и 5 файлов kit/fabric-*.zip (изделие «Ткань»).
