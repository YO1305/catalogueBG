# PROJECT_STATUS

Обновлено: 2026-10-24

## Хранение файлов шаблонов

- Импорт ZIP и макеты тканей сохраняются через **`src/lib/storage.ts` → `saveBuffer()`**.
- На **Vercel (prod)** при `BLOB_STORE_ID` / `VERCEL=1` используется **Vercel Blob** (публичные URL `*.blob.vercel-storage.com`). После редеплоя они **не пропадают**.
- **Локально** без `BLOB_READ_WRITE_TOKEN` — fallback в `public/` (только для dev).
- Явно: `STORAGE_PROVIDER=vercel-blob` в `.env` / Vercel env (см. `.env.example`).

## Макеты: решение SPEC

- Основной формат — **ZIP (§5.7)**; PSD отложен.
- **3b-1** ✅ импорт ZIP (пофайловая загрузка).
- **3b-2** 🟡 в работе:
  - ✅ `engine: uvgrid` — рендер **matte** по `render.py` (KPB).
  - ✅ Живое превью в `MockupAdjuster` (uvgrid + debounce).
  - ✅ Конструктор полосок для `stripe-sateen` (шаг «Рисунок»).
  - ✅ Сохранение WebP 2000 / 1200 / 600 через `renderServer` + кнопка «Сохранить макет WebP» / publish.
  - 🟡 **Sateen (stripe ZIP)** — базовый SPEC-рендер в `render.ts`, полное совпадение с `stripe_sateen` `render.py` — доработка.

## Проверка паритета (обязательный тест)

```bash
# положите ZIP в tmp/ или укажите пути
npm run test:uvgrid-parity -- tmp/kpb.zip tmp/stripe.zip
```

Отчёт: `tmp/uvgrid-parity/index.html` — слева TS, справа `out/` из ZIP.

**KPB (matte):** 5 сцен из `out/` — визуально близко; точное совпадение пикселей упирается в RNG grain и blur (используем детерминированный grain).

**Stripe sateen:** тесты из `run_tests.py` (полоски) — подключить в следующем коммите.

## Чек-лист после деплоя 3b-2

1. Дизайн → шаг макетов → ZIP-шаблон → ползунок масштаба **сразу** меняет превью.
2. Тип ткани «Страйп-сатин» → «Конструктор полосок» → превью полос.
3. «Сохранить макет WebP» или публикация → в карточке ткани URL макета на Blob.
4. `npm run build` без ошибок.
