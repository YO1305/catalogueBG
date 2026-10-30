# PROJECT_STATUS

Обновлено: 2026-10-30

## Рендер макетов (uvgrid)

- Источник правды: `kit/uvgridRender.ts` → `src/lib/mockup/uvgridRender.ts`.
- Превью и финал только uvgrid (Web Worker). Финал: WebP 1200 / 600, клиентский upload, один POST `/api/mockups/save`.
- `MockupRenderer` / `renderServer` удалены. Лаборатория PSD рисует шахматку без WebGL-движка.

## Публичный каталог

- Live public/unlisted: кэш 600 с, без `getSession`. Прямые Blob `srcset` 600/1200.
- Ошибка Firestore → экран «каталог недоступен», без подмены seed.

## Админка

- Автосохранение ткани 30 с + хеш; ползунки макета не пишут, пока не отпущена мышь.
- Списки тканей/каталогов: курсор `startAfter`, 50 строк.
- Статистика: `stats/{slug}_{day}` + заявки каталога, период с/по.
- Пересборка шаблона: `templateIds` array-contains, клиент пачками по 3.

## После деплоя проверить

1. `/c/katalog`: картинки `*.public.blob.vercel-storage.com` `-600.webp` / `-1200.webp`.
2. Админ: логин `admin@bahmal.uz` — ткани, каталоги, статистика за 30 дней.
3. Сохранить ткань: в Firestore появляется `templateIds`.
4. PDF каталога: картинки с Blob, повторный запрос из кэша.
5. `npm run build`.
