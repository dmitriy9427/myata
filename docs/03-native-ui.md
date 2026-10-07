# 03. Тема, кнопки, вибрация, хранилище

Хорошая Mini App не выглядит как «сайт в окошке»: цвета — как у пользователя
в Telegram, главная кнопка — родная, нажатия отзываются вибрацией.

## Тема через CSS-переменные

Скрипт Telegram сам выставляет на `<html>` переменные темы:
`--tg-theme-bg-color`, `--tg-theme-text-color`, `--tg-theme-button-color` и
другие — и обновляет их, если пользователь сменил тему. Ничего не нужно
делать в JS.

В `src/styles/app.scss` — два слоя:

```scss
:root {
  --fb-bg: #eef4f1;        // fallback — запасные значения для браузера
  --fb-accent: #2bb673;

  --bg: var(--tg-theme-secondary-bg-color, var(--fb-bg));
  --accent: var(--tg-theme-button-color, var(--fb-accent));
}
@media (prefers-color-scheme: dark) {
  :root { --fb-bg: #0f1714; }   // тёмная запасная палитра
}
```

Компоненты пользуются только `--bg`, `--accent`, `--text`… В Telegram берётся
его цвет, в браузере — свой. Второй аргумент `var(--a, запасное)` —
стандартный CSS, срабатывает, если переменной нет.

Производные цвета — через `color-mix`, чтобы они подстраивались под любую тему:

```scss
--line: color-mix(in srgb, var(--text) 10%, transparent);
```

**Мятный цвет бренда** (`--mint`) используется только в обложке студии.
Кнопки — цвета Telegram: пользователь привык, что кнопка синяя (или какая у
него тема), и чужой цвет выглядел бы инородно.

## Безопасные зоны

Внизу у iPhone — полоска жестов. В Telegram 8.0+ есть переменная
`--tg-safe-area-inset-bottom`, в браузере — `env(safe-area-inset-bottom)`:

```scss
--safe-bottom: max(var(--tg-safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px));
```

## MainButton через хук

MainButton — не элемент страницы, а кнопка Telegram под WebView. Ей управляют
методами: `setText`, `show`, `enable`, `showProgress`, `onClick`/`offClick`.
У каждого экрана своя главная кнопка («Выбрать время», «Записаться · 2 500 ₽»,
«Готово»), поэтому удобен хук (`src/telegram/hooks.ts`):

```tsx
useMainButton(service ? { text: `Записаться · ${formatPrice(service.price)}`, loading: saving, onClick: submit } : null)
```

Внутри — `useEffect`, который показывает кнопку при монтировании экрана и
прячет при уходе:

```ts
useEffect(() => {
  if (!visible) return
  const onClick = () => { haptic.tap(); handler.current?.() }
  if (webApp) {
    webApp.MainButton.setText(text).show()
    webApp.MainButton.onClick(onClick)
    return () => {                       // уборка при уходе с экрана
      webApp.MainButton.offClick(onClick)
      webApp.MainButton.hide()
    }
  }
  useFallbackButtons.setState({ main: { text, enabled, loading, onClick } })
  return () => useFallbackButtons.setState({ main: null })
}, [visible, text, enabled, loading])
```

Две важные детали:

1. **`offClick` в уборке обязателен.** Telegram копит подписчиков: без
   отписки после трёх переходов один клик вызовет три обработчика.
2. **Колбэк в `ref`.** `onClick` — новая функция на каждый рендер. Если
   положить её в зависимости, эффект переподписывался бы на каждый символ в
   поле комментария. Поэтому подписка одна, а вызывается `handler.current` —
   всегда свежая функция:

```ts
const handler = useRef(options?.onClick)
useEffect(() => { handler.current = options?.onClick })   // без зависимостей — после каждого рендера
```

Это известный паттерн «latest ref» (в React готовится `useEffectEvent` для
того же самого).

Вне Telegram хук пишет состояние в маленький стор Zustand, а
`<FallbackMainButton>` рисует обычную кнопку. **Экраны не знают, в каком они
режиме** — в этом смысл обёртки.

## BackButton

`useBackButton()` вызывается один раз в каркасе (`App.tsx`): на главной стрелка
скрыта, на остальных экранах — видна и делает `navigate(-1)`.

## Вибрация

```ts
export const haptic = {
  select: () => supports('6.1') && webApp!.HapticFeedback.selectionChanged(),   // выбор даты/времени
  tap:    () => supports('6.1') && webApp!.HapticFeedback.impactOccurred('light'),
  success: () => supports('6.1') && webApp!.HapticFeedback.notificationOccurred('success'),
  warning: () => supports('6.1') && webApp!.HapticFeedback.notificationOccurred('warning'),
}
```

Правило из гайдлайнов iOS: `selectionChanged` — когда меняется выбор,
`impact` — нажатие, `notification` — результат действия. Не вибрировать на
каждый чих — это раздражает.

## CloudStorage

Хранилище пользователя в облаке Telegram, отдельное для каждого бота. Запись,
сделанная с телефона, видна и с компьютера.

Ограничения: ключ — до 128 символов, значение — **до 4096 символов**, ключей —
до 1024. Поэтому в «Мяте» все записи лежат под одним ключом `bookings` и
хранится не больше 20 (`MAX_STORED`): будущие — всегда, прошедшие — сколько
влезет (`serializeBookings` в `src/lib/bookings.ts`).

Это **не база данных**: туда пишет сам клиент, а значит, пользователь может
положить туда что угодно. Отсюда осторожный `parseBookings`: битый JSON,
неизвестная услуга, кривая дата — всё отбрасывается, а не роняет приложение.

## Защита от случайного закрытия

На экране подтверждения пользователь мог набрать комментарий. Свайп вниз
закрыл бы приложение и всё потерял бы. `enableClosingConfirmation()` —
Telegram спросит «Закрыть?»:

```ts
useEffect(() => {
  webApp?.enableClosingConfirmation()
  return () => webApp?.disableClosingConfirmation()
}, [])
```
