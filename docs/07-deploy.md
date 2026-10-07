# 07. Деплой и проверка

## GitHub Pages

Telegram требует **HTTPS** — GitHub Pages его даёт бесплатно.

`.github/workflows/pages.yml` при пуше в `main`:

1. `npm ci`
2. `npm run check` — типы, линтер, тесты. Сломанный код не уедет.
3. `npm run build` с `BASE_URL=/myata/` — сайт лежит в подпапке репозитория,
   Vite подставляет её в пути к JS и CSS (`base` в `vite.config.ts`).
4. Загружает `dist/` в Pages.

Один раз в настройках репозитория: **Settings → Pages → Source: GitHub
Actions** (или командой
`gh api -X POST repos/<user>/myata/pages -f build_type=workflow`).

404.html, как в «Летучке», здесь не нужен: из-за MemoryRouter у приложения
один адрес.

## Кеш

Telegram кеширует страницы WebView. Если после деплоя видна старая версия:

- на телефоне — закрыть и открыть приложение, в крайнем случае очистить кеш
  Telegram (Настройки → Данные и память → Использование памяти);
- Vite добавляет хеш в имена JS и CSS (`index-a1b2c3.js`), так что достаточно,
  чтобы обновился сам `index.html`.

## Отладка внутри Telegram

- **Telegram Desktop (Windows/Linux)** и **macOS-версия Telegram** — в
  настройках есть «Experimental settings» → *Enable webview inspecting*. После
  этого правый клик по приложению → «Inspect» открывает DevTools.
- **Android** — включить отладку WebView в Telegram (Настройки → долго нажать на
  номер версии внизу → *Enable WebView Debug*), подключить телефон по USB,
  открыть `chrome://inspect` на компьютере.
- **iOS** — Safari → меню «Разработка» → телефон → страница WebView (нужно
  включить «Веб-инспектор» в настройках Safari на iPhone).
- Быстрее всего — **локальный туннель**: `npx localtunnel --port 5193` или
  `cloudflared tunnel --url http://localhost:5193` даёт HTTPS-адрес, его можно
  временно поставить в кнопку меню тестового бота и видеть изменения без деплоя.
  Для этого лучше завести отдельного бота «для разработки».

## Чек-лист перед показом

- [ ] `npm run check` зелёный
- [ ] В браузере: светлая и тёмная тема, ширина 360 px, нет горизонтальной прокрутки
- [ ] В Telegram: цвета темы, MainButton, BackButton, вибрация
- [ ] Запись появляется на втором устройстве (CloudStorage)
- [ ] «Назад» после записи ведёт на главную, а не в форму
