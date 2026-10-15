# 02. Обёртка над API и демо-режим

Можно было бы писать в компонентах `window.Telegram.WebApp.MainButton.show()`.
Но тогда:

- в обычном браузере приложение падает или ничего не делает — а его нужно
  показывать в портфолио и разрабатывать без телефона;
- проверки версии размазаны по всем экранам;
- callback-API (`CloudStorage.getItem(key, cb)`) неудобен рядом с `async/await`.

Поэтому вся работа с Telegram — в `src/telegram/`, а экраны вызывают
понятные функции.

## Типы

У объекта `WebApp` нет «официальных» типов в самом скрипте. Есть пакет
`@twa-dev/types`, но я описал только используемую часть руками —
`src/telegram/types.ts`. Так видно, на что опирается проект, и это хорошее
упражнение: открываешь [документацию](https://core.telegram.org/bots/webapps)
и переносишь нужное.

```ts
declare global {
  interface Window {
    Telegram?: { WebApp: WebApp }
  }
}
```

`declare global` дописывает поле в стандартный тип `Window` — после этого
`window.Telegram` типизирован во всём проекте.

## Ключевые функции (`src/telegram/telegram.ts`)

```ts
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

export const inTelegram = Boolean(tg?.initData)
export const supports = (version: string) => inTelegram && Boolean(tg?.isVersionAtLeast(version))
export const webApp = inTelegram ? tg! : null
```

- `webApp` — `null` вне Telegram. Код пишется как `webApp?.close()` или
  `if (webApp) …` — TypeScript не даст забыть про демо-режим.
- `supports('6.9')` — и «мы в Telegram», и «клиент достаточно новый».

## Запуск

```ts
export function initTelegram() {
  if (!webApp) return
  webApp.ready()    // «я загрузилось» — Telegram убирает заглушку загрузки
  webApp.expand()   // развернуть шторку на весь экран
  if (supports('6.1')) {
    webApp.setHeaderColor('secondary_bg_color')      // шапка — цвета фона приложения
    webApp.setBackgroundColor('secondary_bg_color')
  }
}
```

`ready()` стоит вызывать как можно раньше: пока его нет, Telegram показывает
свой индикатор загрузки. Вызов в `main.tsx` — до рендера React.

## Промисы вместо колбэков

```ts
get(key) {
  if (supports('6.9')) {
    return new Promise((resolve) =>
      webApp!.CloudStorage.getItem(key, (error, value) => resolve(error ? null : value || null)))
  }
  return Promise.resolve(localStorage.getItem(`myata:${key}`))
}
```

Паттерн «обернуть колбэк в `new Promise`» встречается везде: старые
браузерные API, Node-библиотеки, SDK. Внутри Telegram — облако, вне — 
`localStorage`, а вызывающему коду (`store/bookings.ts`) всё равно: он делает
`await storage.get('bookings')`.

То же с диалогом:

```ts
export function confirmDialog(message: string): Promise<boolean> {
  if (supports('6.2')) return new Promise((resolve) => webApp!.showConfirm(message, resolve))
  return Promise.resolve(window.confirm(message))
}
```

## Демо-режим

Вне Telegram:

| Telegram | Браузер |
| --- | --- |
| MainButton | Своя кнопка внизу (`FallbackMainButton`) |
| BackButton | Кнопка «‹ Назад» в демо-шапке |
| Цвета темы | Запасная мятная палитра, светлая и тёмная по системе |
| CloudStorage | `localStorage` с префиксом `myata:` |
| Вибрация | Ничего |
| Имя пользователя | «гость (демо-режим)» |

На `<html>` вешается класс `is-telegram` или `is-browser` (`main.tsx`) — в
стилях можно отличать режимы, например ограничить ширину в браузере.

## Как проверить режим Telegram без телефона

Подложить поддельный объект **до** загрузки страницы. В Playwright:

```js
await page.addInitScript(() => {
  window.Telegram = { WebApp: { initData: 'user=…', version: '8.0', /* заглушки методов, которые пишут в лог */ } }
})
```

…а запрос к `telegram-web-app.js` перехватить, чтобы настоящий скрипт не
перезаписал заглушку. Так я проверял, что на каждом экране вызываются нужные
методы: `MainButton.setText`, `BackButton.show`, `CloudStorage.setItem` и т. д.
Для ручной проверки в настоящем Telegram — глава 07.

## Ошибки

> **`window.Telegram.WebApp` прямо в компонентах.** В браузере всё ломается, а проверки версии
> размазаны по экранам. Одна обёртка.
>
> **Колбэки CloudStorage в компонентах.** Вложенные колбэки и забытые ошибки. Обёртка возвращает
> промисы.
>
> **Демо-режим «как-нибудь».** Если в браузере кнопок нет, приложение не показать в портфолио и не
> протестировать. Те же хуки рисуют свои кнопки.

## Попробуйте сами

1. Добавьте в обёртку функцию `openLink(url)`: в Telegram — `webApp.openLink(url)` (версия 6.4+),
   иначе — `window.open(url, '_blank')`.
2. Почему `storage.get` в браузере обёрнут в `try/catch`?

<details>
<summary>Ответы</summary>

1. ```ts
   export function openLink(url: string) {
     if (supports('6.4')) webApp!.openLink(url)
     else window.open(url, '_blank', 'noopener')
   }
   ```
   И описать метод в типах (`src/telegram/types.ts`): `openLink(url: string): void` у `WebApp`.
2. В приватном режиме или при запрете cookies `localStorage` бросает исключение — приложение
   должно работать без сохранения, а не падать.
</details>
