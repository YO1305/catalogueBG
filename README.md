# BAHMAL HOME — каталог тканей

Журнал для клиентов и кабинет для сотрудников: дизайнер загружает рисунок, менеджер собирает каталог, клиент листает его по ссылке.

Стек из [SPEC.md](SPEC.md): Next.js 15 (App Router), TypeScript, Tailwind, Firebase (Firestore, Storage, Auth), `react-pageflip`, `ag-psd`, `sharp`, Groq, Telegram. PDF собирается через `pdf-lib` и шрифты DejaVu: так свежий клон открывается без Chromium.

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:3000. Сборка: `npm run build && npm start`. Тесты: `npm test`.

Пока не заданы ключи Firebase, данные читаются из `data/seed.json`. Изменения пишутся в `data/runtime.json` (файл не коммитится). Загруженные файлы ложатся в `public/uploads`.

## Демо-входы

| Роль | Почта | Пароль |
| --- | --- | --- |
| Админ | admin@bahmal.uz | bahmal-admin |
| Дизайнер | designer@bahmal.uz | bahmal-design |
| Менеджер | manager@bahmal.uz | bahmal-manager |

Закрытый каталог `/c/b2b-prices` открывается кодом `2580`.

Публичные журналы: `/c/kurpacha-2026`, `/c/euro-sateen`, `/c/fashion-poland`, `/c/towels-kitchen`, `/c/novinki-osen`.

## Свои ключи

Скопируйте `.env.example` в `.env.local`.

- `GROQ_API_KEY` — перевод карточки через `llama-3.3-70b-versatile`. Без ключа карточка заполняется словарём и транслитом, в ответе `engine: "fallback"`.
- `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` — уведомление о заявке. Без них заявка всё равно сохраняется.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — тогда чтение и запись идут в Firestore, файлы в Storage. `npm run seed` заливает стартовые данные.
- `NEXT_PUBLIC_FIREBASE_*` — вход сотрудников через Firebase Auth. Роль берётся из custom claim `role` (`admin`, `designer`, `manager`).
- `SESSION_SECRET` — подпись cookie. В проде задайте свой.
- `NEXT_PUBLIC_DEMO_AUTH=0` — отключает локальные пароли, когда Firebase уже подключён.

Секреты не кладутся в репозиторий и не попадают в клиентский бандл.
